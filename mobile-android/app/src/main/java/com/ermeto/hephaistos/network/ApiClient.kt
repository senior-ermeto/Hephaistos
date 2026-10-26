package com.ermeto.hephaistos.network

import com.ermeto.hephaistos.model.MachineItem
import com.ermeto.hephaistos.model.OperatorUser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class ApiClient(var baseUrl: String = "http://10.0.2.2:8000") {

    private fun cleanBaseUrl(): String = baseUrl.trim().removeSuffix("/")

    suspend fun fetchOperators(): Result<List<OperatorUser>> = withContext(Dispatchers.IO) {
        runCatching {
            val url = URL("${cleanBaseUrl()}/api/auth/operators")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 6000
                readTimeout = 6000
            }
            val code = conn.responseCode
            val body = readStream(conn, code in 200..299)
            if (code !in 200..299) {
                throw Exception("Erreur serveur ($code): $body")
            }
            val arr = JSONArray(body)
            val list = mutableListOf<OperatorUser>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    OperatorUser(
                        id = obj.getInt("id"),
                        username = obj.optString("username", ""),
                        firstName = obj.optString("first_name", ""),
                        lastName = obj.optString("last_name", ""),
                        role = obj.optString("role", "OPERATOR"),
                        badgeCode = if (obj.isNull("badge_code")) null else obj.optString("badge_code")
                    )
                )
            }
            list
        }
    }

    suspend fun fetchMachines(): Result<List<MachineItem>> = withContext(Dispatchers.IO) {
        runCatching {
            val url = URL("${cleanBaseUrl()}/api/machines")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 6000
                readTimeout = 6000
            }
            val code = conn.responseCode
            val body = readStream(conn, code in 200..299)
            if (code !in 200..299) {
                throw Exception("Erreur chargement machines ($code)")
            }
            val arr = JSONArray(body)
            val list = mutableListOf<MachineItem>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val opObj = obj.optJSONObject("current_operator")
                val opName = if (opObj != null) {
                    "${opObj.optString("first_name")} ${opObj.optString("last_name")}"
                } else null

                list.add(
                    MachineItem(
                        id = obj.getInt("id"),
                        code = obj.optString("code", ""),
                        name = obj.optString("name", ""),
                        workshopSector = obj.optString("workshop_sector", "Atelier"),
                        description = if (obj.isNull("description")) null else obj.optString("description"),
                        currentStatus = obj.optString("current_status", "PAUSE"),
                        currentReason = if (obj.isNull("current_reason")) null else obj.optString("current_reason"),
                        currentOperatorName = opName
                    )
                )
            }
            list
        }
    }

    suspend fun sendDeclaration(
        machineId: Int,
        userId: Int,
        statusType: String,
        reasonDetail: String? = null
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val url = URL("${cleanBaseUrl()}/api/declarations")
            val payload = JSONObject().apply {
                put("machine_id", machineId)
                put("user_id", userId)
                put("status_type", statusType)
                if (!reasonDetail.isNullOrBlank()) {
                    put("reason_detail", reasonDetail.trim())
                }
            }
            postJson(url, payload)
        }
    }

    suspend fun sendOperatorChange(
        newUserId: Int,
        previousUserId: Int?,
        machineId: Int? = null,
        pinCode: String? = null
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val url = URL("${cleanBaseUrl()}/api/declarations/operator-change")
            val payload = JSONObject().apply {
                put("user_id", newUserId)
                if (previousUserId != null) put("previous_user_id", previousUserId)
                if (machineId != null) put("machine_id", machineId)
                if (!pinCode.isNullOrBlank()) put("pin_code", pinCode.trim())
                put("notes", "Changement d'opérateur depuis application Android")
            }
            postJson(url, payload)
        }
    }

    private fun postJson(url: URL, payload: JSONObject) {
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=UTF-8")
            connectTimeout = 6000
            readTimeout = 6000
        }
        OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { writer ->
            writer.write(payload.toString())
            writer.flush()
        }
        val code = conn.responseCode
        val body = readStream(conn, code in 200..299)
        if (code !in 200..299) {
            val detail = runCatching { JSONObject(body).optString("detail", body) }.getOrDefault(body)
            throw Exception(detail)
        }
    }

    private fun readStream(conn: HttpURLConnection, success: Boolean): String {
        val stream = if (success) conn.inputStream else conn.errorStream
        if (stream == null) return ""
        return BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
    }
}
