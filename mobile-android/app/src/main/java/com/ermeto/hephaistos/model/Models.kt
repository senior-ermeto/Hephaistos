package com.ermeto.hephaistos.model

data class OperatorUser(
    val id: Int,
    val username: String,
    val firstName: String,
    val lastName: String,
    val role: String,
    val badgeCode: String? = null
) {
    val fullName: String
        get() = "$firstName ${lastName.uppercase()}"
}

data class MachineItem(
    val id: Int,
    val code: String,
    val name: String,
    val workshopSector: String,
    val description: String?,
    val currentStatus: String,
    val currentReason: String?,
    val currentOperatorName: String?
)

enum class DeclarationAction(
    val apiCode: String,
    val labelFr: String,
    val isStopSubAction: Boolean = false
) {
    PRODUCTION("PRODUCTION", "Production", false),
    PAUSE("PAUSE", "Pause", false),
    STOP_TOOL_CHANGE("STOP_TOOL_CHANGE", "Changement d'outil", true),
    STOP_WAITING("STOP_WAITING", "Attentes", true),
    STOP_BREAKDOWN("STOP_BREAKDOWN", "Panne", true),
    STOP_OTHER("STOP_OTHER", "Autres arrêt (précisé en texte)", true);

    companion object {
        fun fromCode(code: String): DeclarationAction {
            return entries.find { it.apiCode == code } ?: PAUSE
        }
    }
}
