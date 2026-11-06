Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = "C:\Users\hp\Desktop\REA\metrolist-desktop"
WshShell.CurrentDirectory = appDir

' Check if port 5173 is already responding
Set objHTTP = CreateObject("MSXML2.ServerXMLHTTP.6.0")
isServerRunning = False
On Error Resume Next
objHTTP.open "GET", "http://127.0.0.1:5173", False
objHTTP.send
If Err.Number = 0 Then
    isServerRunning = True
End If
On Error Goto 0

If Not isServerRunning Then
    ' Start Vite dev server silently in the background without any CMD window (0 = hidden)
    WshShell.Run "cmd /c npm run dev -- --host 127.0.0.1 --port 5173", 0, False
    WScript.Sleep 2500
End If

' Launch in standalone Desktop Application Window Mode
edgePath64 = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
edgePathX86 = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"

If fso.FileExists(edgePath64) Then
    WshShell.Run """" & edgePath64 & """ --app=http://127.0.0.1:5173/ --window-name=SunoNa", 1, False
ElseIf fso.FileExists(edgePathX86) Then
    WshShell.Run """" & edgePathX86 & """ --app=http://127.0.0.1:5173/ --window-name=SunoNa", 1, False
ElseIf fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """ --app=http://127.0.0.1:5173/ --window-name=SunoNa", 1, False
Else
    WshShell.Run "http://127.0.0.1:5173/", 1, False
End If

