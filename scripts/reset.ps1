# scripts/reset.ps1 — 清空所有故事資料 + 玩家進度，準備重新 seed
# Run: pwsh -File scripts/reset.ps1
# WARNING: 刪除所有 stories, story_fragments, scenes, options, atmosphere,
#          以及玩家的 fragments (收藏進度) 和 creature_pages。

$SUPA_URL = "https://zdbcjilnnqfmebdkyjbx.supabase.co/rest/v1"
$KEY      = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkYmNqaWxubnFmbWViZGt5amJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI5MDQ5OSwiZXhwIjoyMDk0ODY2NDk5fQ.Rcotaxnp4ufsCvdyT1OJ4UQMOUpSO8zea0aG0k3zg5M"
$H = @{
    "apikey"        = $KEY
    "Authorization" = "Bearer $KEY"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

function DeleteRows($table, $filter) {
    try {
        Invoke-RestMethod -Uri "$SUPA_URL/${table}?${filter}" -Method Delete -Headers $H | Out-Null
        Write-Host "  deleted $table" -ForegroundColor DarkGray
    } catch {
        Write-Host "  WARN: $table — $($_.Exception.Message)" -ForegroundColor DarkYellow
    }
}

Write-Host "`n── 清空資料 ──" -ForegroundColor Red

# Delete child tables first (FK order)
DeleteRows "scene_options"       "scene_id=not.is.null"
DeleteRows "fragment_atmosphere" "story_fragment_id=not.is.null"
DeleteRows "fragment_scenes"     "story_fragment_id=not.is.null"
DeleteRows "fragments"           "player_id=not.is.null"
DeleteRows "story_fragments"     "story_id=not.is.null"
DeleteRows "stories"             "id=not.is.null"

# creature_pages (may or may not exist)
try {
    Invoke-RestMethod -Uri "$SUPA_URL/creature_pages?player_id=not.is.null" -Method Delete -Headers $H | Out-Null
    Write-Host "  deleted creature_pages" -ForegroundColor DarkGray
} catch {}

Write-Host "`n✅ 資料已清空，可執行 seed.ps1" -ForegroundColor Green
