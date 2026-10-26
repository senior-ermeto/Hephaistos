package com.ermeto.hephaistos

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ermeto.hephaistos.model.DeclarationAction
import com.ermeto.hephaistos.model.MachineItem
import com.ermeto.hephaistos.model.OperatorUser
import com.ermeto.hephaistos.network.ApiClient
import com.ermeto.hephaistos.ui.theme.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences("hephaistos_prefs", Context.MODE_PRIVATE)
        val savedServerUrl = prefs.getString("server_url", "http://10.0.2.2:8000") ?: "http://10.0.2.2:8000"

        setContent {
            HephaistosTheme {
                HephaistosAppScreen(
                    initialServerUrl = savedServerUrl,
                    onSaveServerUrl = { newUrl ->
                        prefs.edit().putString("server_url", newUrl).apply()
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HephaistosAppScreen(
    initialServerUrl: String,
    onSaveServerUrl: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var serverUrl by remember { mutableStateOf(initialServerUrl) }
    val apiClient = remember(serverUrl) { ApiClient(serverUrl) }

    var operators by remember { mutableStateOf<List<OperatorUser>>(emptyList()) }
    var machines by remember { mutableStateOf<List<MachineItem>>(emptyList()) }
    var currentOperator by remember { mutableStateOf<OperatorUser?>(null) }

    var isLoading by remember { mutableStateOf(false) }
    var selectedMachine by remember { mutableStateOf<MachineItem?>(null) }
    var showOperatorSelectorDialog by remember { mutableStateOf(false) }
    var showServerConfigDialog by remember { mutableStateOf(false) }

    fun refreshAll() {
        scope.launch {
            isLoading = true
            apiClient.fetchOperators().onSuccess { ops ->
                operators = ops
            }.onFailure { err ->
                snackbarHostState.showSnackbar("Erreur réseau : ${err.message}")
            }
            apiClient.fetchMachines().onSuccess { machs ->
                machines = machs
            }
            isLoading = false
        }
    }

    LaunchedEffect(serverUrl) {
        refreshAll()
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = ErmetoNavy,
                    titleContentColor = Color.White
                ),
                title = {
                    Column {
                        Text(
                            text = "HÉPHAÏSTOS — ERMETO",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = currentOperator?.let { "Opérateur : ${it.fullName}" }
                                ?: "Veuillez préciser qui vous êtes",
                            fontSize = 12.sp,
                            color = Color(0xFF7DD3FC)
                        )
                    }
                },
                actions = {
                    // Bouton "Changement d'opérateur" (loggé côté serveur)
                    if (currentOperator != null) {
                        Button(
                            onClick = { showOperatorSelectorDialog = true },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFBBF24),
                                contentColor = ErmetoDark
                            ),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Icon(
                                Icons.Default.SwapHoriz,
                                contentDescription = "Changement d'opérateur",
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Changement d'opérateur",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                    IconButton(onClick = { refreshAll() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualiser", tint = Color.White)
                    }
                    IconButton(onClick = { showServerConfigDialog = true }) {
                        Icon(Icons.Default.Settings, contentDescription = "Serveur", tint = Color.White)
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(SurfaceLight)
        ) {
            // Étape 1 : L'utilisateur doit préciser qui il est
            if (currentOperator == null) {
                OperatorIdentificationScreen(
                    operators = operators,
                    isLoading = isLoading,
                    onSelectOperator = { chosenOp ->
                        scope.launch {
                            apiClient.sendOperatorChange(
                                newUserId = chosenOp.id,
                                previousUserId = null
                            )
                            currentOperator = chosenOp
                            snackbarHostState.showSnackbar("Bienvenue ${chosenOp.fullName}")
                        }
                    },
                    onOpenServerSettings = { showServerConfigDialog = true },
                    onRetry = { refreshAll() }
                )
            } else {
                // Étape 2 : Liste des noms de machines
                Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                    Text(
                        text = "CLIQUEZ SUR UNE MACHINE POUR DÉCLARER UNE ACTION :",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = ErmetoNavy,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(machines, key = { it.id }) { machine ->
                            MachineCard(
                                machine = machine,
                                onClick = { selectedMachine = machine }
                            )
                        }
                    }
                }
            }
        }
    }

    // Modale : Boutons Actions / Déclarations au clic sur une machine
    selectedMachine?.let { machine ->
        val op = currentOperator
        if (op != null) {
            MachineDeclarationDialog(
                machine = machine,
                operator = op,
                onDismiss = { selectedMachine = null },
                onSubmitDeclaration = { action, customReason ->
                    scope.launch {
                        val res = apiClient.sendDeclaration(
                            machineId = machine.id,
                            userId = op.id,
                            statusType = action.apiCode,
                            reasonDetail = customReason
                        )
                        res.onSuccess {
                            selectedMachine = null
                            refreshAll()
                            snackbarHostState.showSnackbar(
                                "Déclaration [${action.labelFr}] enregistrée sur ${machine.code}"
                            )
                        }.onFailure { err ->
                            snackbarHostState.showSnackbar("Erreur : ${err.message}")
                        }
                    }
                }
            )
        }
    }

    // Modale : Bouton Changement d'opérateur (journalisé côté serveur)
    if (showOperatorSelectorDialog) {
        OperatorChangeDialog(
            operators = operators,
            currentOperator = currentOperator,
            onDismiss = { showOperatorSelectorDialog = false },
            onConfirmSwitch = { newOp, pin ->
                scope.launch {
                    val res = apiClient.sendOperatorChange(
                        newUserId = newOp.id,
                        previousUserId = currentOperator?.id,
                        pinCode = pin
                    )
                    res.onSuccess {
                        currentOperator = newOp
                        showOperatorSelectorDialog = false
                        refreshAll()
                        snackbarHostState.showSnackbar(
                            "Changement d'opérateur loggé : ${newOp.fullName}"
                        )
                    }.onFailure { err ->
                        snackbarHostState.showSnackbar("Refusé : ${err.message}")
                    }
                }
            }
        )
    }

    // Modale : Configuration de l'adresse IP du serveur Debian
    if (showServerConfigDialog) {
        ServerConfigDialog(
            currentUrl = serverUrl,
            onDismiss = { showServerConfigDialog = false },
            onSave = { newUrl ->
                serverUrl = newUrl
                onSaveServerUrl(newUrl)
                showServerConfigDialog = false
            }
        )
    }
}

@Composable
fun OperatorIdentificationScreen(
    operators: List<OperatorUser>,
    isLoading: Boolean,
    onSelectOperator: (OperatorUser) -> Unit,
    onOpenServerSettings: () -> Unit,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Card(
            colors = CardDefaults.cardColors(containerColor = ErmetoNavy),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "IDENTIFICATION OPÉRATEUR",
                    color = Color(0xFF7DD3FC),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Qui êtes-vous ?",
                    color = Color.White,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Sélectionnez votre nom dans la liste pour accéder aux déclarations machines.",
                    color = Color(0xFFCBD5E1),
                    fontSize = 13.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (isLoading) {
            CircularProgressIndicator(color = ErmetoNavy)
        } else if (operators.isEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Impossible de joindre le serveur Héphaïstos.", fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedButton(onClick = onOpenServerSettings) {
                            Text("Configurer IP Serveur")
                        }
                        Button(
                            onClick = onRetry,
                            colors = ButtonDefaults.buttonColors(containerColor = ErmetoNavy)
                        ) {
                            Text("Réessayer")
                        }
                    }
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(operators, key = { it.id }) { op ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelectOperator(op) }
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .background(ErmetoNavy),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "${op.firstName.take(1)}${op.lastName.take(1)}",
                                    color = Color.White,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                            Spacer(modifier = Modifier.width(14.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = op.fullName,
                                    fontWeight = FontWeight.ExtraBold,
                                    fontSize = 16.sp,
                                    color = ErmetoNavy
                                )
                                Text(
                                    text = "ID: ${op.username} • ${op.role}",
                                    fontSize = 12.sp,
                                    color = Color.Gray
                                )
                            }
                            Icon(
                                Icons.Default.ChevronRight,
                                contentDescription = null,
                                tint = ErmetoNavy
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun MachineCard(
    machine: MachineItem,
    onClick: () -> Unit
) {
    val action = DeclarationAction.fromCode(machine.currentStatus)
    val statusColor = when (action) {
        DeclarationAction.PRODUCTION -> StatusProduction
        DeclarationAction.PAUSE -> StatusPause
        DeclarationAction.STOP_TOOL_CHANGE -> StatusToolChange
        DeclarationAction.STOP_WAITING -> StatusWaiting
        DeclarationAction.STOP_BREAKDOWN -> StatusBreakdown
        DeclarationAction.STOP_OTHER -> StatusOther
    }

    Card(
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .background(statusColor)
            )
            Column(modifier = Modifier.padding(18.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        color = ErmetoNavy,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            text = machine.code,
                            color = Color.White,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                        )
                    }

                    Surface(
                        color = statusColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(50)
                    ) {
                        Text(
                            text = action.labelFr,
                            color = statusColor,
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = machine.name,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 19.sp,
                    color = ErmetoNavy
                )
                Text(
                    text = machine.workshopSector,
                    fontSize = 13.sp,
                    color = Color.Gray
                )

                if (!machine.currentReason.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Motif : ${machine.currentReason}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFFB45309)
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = Color(0xFFE2E8F0))
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Opérateur : ${machine.currentOperatorName ?: "Non assigné"}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF334155)
                    )
                    Text(
                        text = "Appuyer pour déclarer →",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = ErmetoNavy
                    )
                }
            }
        }
    }
}

@Composable
fun MachineDeclarationDialog(
    machine: MachineItem,
    operator: OperatorUser,
    onDismiss: () -> Unit,
    onSubmitDeclaration: (DeclarationAction, String?) -> Unit
) {
    var showStopSubOptions by remember { mutableStateOf(false) }
    var showOtherTextPrompt by remember { mutableStateOf(false) }
    var otherReasonText by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column {
                // En-tête #00305B
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(ErmetoNavy)
                        .padding(20.dp)
                ) {
                    Text(
                        text = machine.code,
                        color = Color(0xFF7DD3FC),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = machine.name,
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Déclarant : ${operator.fullName}",
                        color = Color(0xFFE2E8F0),
                        fontSize = 12.sp
                    )
                }

                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // 1. Bouton PRODUCTION
                    Button(
                        onClick = { onSubmitDeclaration(DeclarationAction.PRODUCTION, null) },
                        colors = ButtonDefaults.buttonColors(containerColor = StatusProduction),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(56.dp)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("PRODUCTION", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                    }

                    // 2. Bouton PAUSE
                    Button(
                        onClick = { onSubmitDeclaration(DeclarationAction.PAUSE, null) },
                        colors = ButtonDefaults.buttonColors(containerColor = StatusPause),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(56.dp)
                    ) {
                        Icon(Icons.Default.Pause, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("PAUSE", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                    }

                    // 3. Bouton ARRÊT (déroule les 4 types d'arrêt)
                    Button(
                        onClick = { showStopSubOptions = !showStopSubOptions },
                        colors = ButtonDefaults.buttonColors(containerColor = StatusBreakdown),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth().height(56.dp)
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("ARRÊT MACHINE", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                    }

                    // Sous-options Arrêt : Changement d'outil, Attentes, Panne, Autres arrêt
                    AnimatedVisibility(visible = showStopSubOptions) {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.padding(top = 6.dp)
                        ) {
                            Button(
                                onClick = { onSubmitDeclaration(DeclarationAction.STOP_TOOL_CHANGE, null) },
                                colors = ButtonDefaults.buttonColors(containerColor = StatusToolChange),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Arrêt : Changement d'outil", fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { onSubmitDeclaration(DeclarationAction.STOP_WAITING, null) },
                                colors = ButtonDefaults.buttonColors(containerColor = StatusWaiting),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Arrêt : Attentes", fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { onSubmitDeclaration(DeclarationAction.STOP_BREAKDOWN, null) },
                                colors = ButtonDefaults.buttonColors(containerColor = StatusBreakdown),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Arrêt : Panne", fontWeight = FontWeight.Bold)
                            }

                            Button(
                                onClick = { showOtherTextPrompt = true },
                                colors = ButtonDefaults.buttonColors(containerColor = StatusOther),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Arrêt : Autres arrêt (précisé en texte)", fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // Champ texte obligatoire si "Autres arrêt"
                    AnimatedVisibility(visible = showOtherTextPrompt) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = otherReasonText,
                                onValueChange = { otherReasonText = it },
                                label = { Text("Précisez le motif de l'arrêt *") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Button(
                                enabled = otherReasonText.isNotBlank(),
                                onClick = {
                                    onSubmitDeclaration(
                                        DeclarationAction.STOP_OTHER,
                                        otherReasonText.trim()
                                    )
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = ErmetoNavy),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text("Envoyer Autre Arrêt", fontWeight = FontWeight.ExtraBold)
                            }
                        }
                    }

                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text("Fermer", color = ErmetoNavy, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun OperatorChangeDialog(
    operators: List<OperatorUser>,
    currentOperator: OperatorUser?,
    onDismiss: () -> Unit,
    onConfirmSwitch: (OperatorUser, String?) -> Unit
) {
    Dialog(onDismissRequest = onDismiss) {
        Card(
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "Changement d'opérateur",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = ErmetoNavy
                )
                Text(
                    text = "Sélectionnez le nouvel opérateur (enregistré sur le serveur) :",
                    fontSize = 12.sp,
                    color = Color.Gray
                )
                Spacer(modifier = Modifier.height(12.dp))

                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.weight(1f, fill = false)
                ) {
                    items(operators, key = { it.id }) { op ->
                        OutlinedButton(
                            onClick = { onConfirmSwitch(op, null) },
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "${op.fullName} (${op.username})",
                                fontWeight = if (op.id == currentOperator?.id) FontWeight.ExtraBold else FontWeight.Medium,
                                color = ErmetoNavy
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                TextButton(
                    onClick = onDismiss,
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("Annuler", color = ErmetoNavy)
                }
            }
        }
    }
}

@Composable
fun ServerConfigDialog(
    currentUrl: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var urlText by remember { mutableStateOf(currentUrl) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Adresse Serveur Héphaïstos", fontWeight = FontWeight.ExtraBold) },
        text = {
            Column {
                Text("Entrez l'URL de votre serveur Debian :", fontSize = 13.sp)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = urlText,
                    onValueChange = { urlText = it },
                    singleLine = true,
                    placeholder = { Text("http://192.168.1.50") }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(urlText.trim()) },
                colors = ButtonDefaults.buttonColors(containerColor = ErmetoNavy)
            ) {
                Text("Enregistrer")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler")
            }
        }
    )
}
