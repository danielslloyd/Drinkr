Option Explicit

Dim fso, sh, dir

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
dir     = fso.GetParentFolderName(WScript.ScriptFullName)

sh.CurrentDirectory = dir

' ── Check Node.js is installed ────────────────────────────────────────────────
If sh.Run("cmd /c where npm", 0, True) <> 0 Then
  MsgBox "Node.js is not installed." & vbCrLf & vbCrLf & _
         "Please download and install it from:" & vbCrLf & _
         "https://nodejs.org  (choose the LTS version)", _
         vbExclamation, "Drinkr — Setup Required"
  WScript.Quit
End If

' ── Kill any existing Drinkr server on port 5173 ──────────────────────────────
sh.Run "powershell -WindowStyle Hidden -Command """ & _
  "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | " & _
  "ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }""", _
  0, True

' ── First-time setup: install dependencies ────────────────────────────────────
If Not fso.FolderExists(dir & "\node_modules") Then
  sh.Run "cmd /c npm install", 1, True   ' shows window so user sees progress
End If

' ── Start Vite dev server silently in the background ──────────────────────────
sh.Run "cmd /c npm run dev > .drinkr.log 2>&1", 0, False

' ── Wait for Vite to be ready ─────────────────────────────────────────────────
WScript.Sleep 3000

' ── Open in default browser ───────────────────────────────────────────────────
sh.Run "http://localhost:5173"
