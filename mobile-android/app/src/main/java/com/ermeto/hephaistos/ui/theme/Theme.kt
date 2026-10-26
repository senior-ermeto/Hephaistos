package com.ermeto.hephaistos.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ErmetoNavy = Color(0xFF00305B)
val ErmetoDark = Color(0xFF001F3D)
val ErmetoCyan = Color(0xFF00A3E0)
val SurfaceLight = Color(0xFFF4F7FA)

val StatusProduction = Color(0xFF10B981)
val StatusPause = Color(0xFFF59E0B)
val StatusToolChange = Color(0xFF6366F1)
val StatusWaiting = Color(0xFFF97316)
val StatusBreakdown = Color(0xFFEF4444)
val StatusOther = Color(0xFF64748B)

private val HephaistosColorScheme = lightColorScheme(
    primary = ErmetoNavy,
    secondary = ErmetoCyan,
    background = SurfaceLight,
    surface = Color.White,
    onPrimary = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A)
)

@Composable
fun HephaistosTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = HephaistosColorScheme,
        content = content
    )
}
