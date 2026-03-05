#!/usr/bin/env pwsh

# Simple HTTP Server for MASHA Piano
$port = 8000
$rootPath = (Get-Location).Path

Write-Host "=========================================" -ForegroundColor Green
Write-Host "MASHA Piano - Local HTTP Server" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Serving from: $rootPath" -ForegroundColor Cyan
Write-Host "Open your browser: http://localhost:$port" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

$httpListener = New-Object System.Net.HttpListener
$httpListener.Prefixes.Add("http://localhost:$port/")

try {
    $httpListener.Start()
    Write-Host "Server started successfully!" -ForegroundColor Green
    Write-Host ""
    
    while ($httpListener.IsListening) {
        $context = $httpListener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $requestPath = $request.Url.LocalPath
        if ($requestPath -eq "/") {
            $requestPath = "/index.html"
        }
        
        $filePath = Join-Path $rootPath $requestPath.TrimStart("/")
        
        Write-Host "Request: $($request.Url.AbsolutePath)" -ForegroundColor Gray
        
        if (Test-Path $filePath -PathType Leaf) {
            $fileInfo = Get-Item $filePath
            $extension = $fileInfo.Extension
            
            $contentTypes = @{
                ".html" = "text/html; charset=utf-8"
                ".css" = "text/css"
                ".js" = "application/javascript"
                ".json" = "application/json"
                ".svg" = "image/svg+xml"
                ".png" = "image/png"
                ".jpg" = "image/jpeg"
                ".mp3" = "audio/mpeg"
            }
            
            $contentType = $contentTypes[$extension]
            if (-not $contentType) {
                $contentType = "application/octet-stream"
            }
            
            $response.ContentType = $contentType
            $response.StatusCode = 200
            
            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $fileBytes.Length
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            
            Write-Host "   OK 200" -ForegroundColor Green
        }
        else {
            $response.StatusCode = 404
            $response.ContentType = "text/html"
            $errorMsg = "404 Not Found"
            $errorBytes = [System.Text.Encoding]::UTF8.GetBytes($errorMsg)
            $response.ContentLength64 = $errorBytes.Length
            $response.OutputStream.Write($errorBytes, 0, $errorBytes.Length)
            
            Write-Host "   NOT FOUND 404" -ForegroundColor Red
        }
        
        $response.OutputStream.Close()
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
finally {
    $httpListener.Stop()
    $httpListener.Close()
    Write-Host ""
    Write-Host "Server stopped" -ForegroundColor Yellow
}
