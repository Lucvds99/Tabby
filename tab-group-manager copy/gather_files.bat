@echo off
setlocal enabledelayedexpansion

rem Set output file
set "outfile=copy.txt"

rem Delete output file if it already exists
if exist "%outfile%" del "%outfile%"

rem Define file extensions to include (only process these)
set "INCLUDE=.html .htm .js .css .txt .md .json .xml"

rem Loop through all files recursively
for /r %%F in (*) do (
    set "ext=%%~xF"
    set "include_file=false"

    rem Check if file extension is in the include list
    for %%I in (%INCLUDE%) do (
        if /i "%%I"=="!ext!" set "include_file=true"
    )

    if "!include_file!"=="true" (
        rem Get relative path (without the full drive path)
        set "filepath=%%F"
        set "relpath=!filepath:%cd%\=!"

        rem Write filename and content to output
        >>"%outfile%" echo(!relpath!
        >>"%outfile%" type "%%F"
        >>"%outfile%" echo(
    )
)

echo Done! All suitable files copied to %outfile%.
pause
