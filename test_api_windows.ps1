# PowerShell скрипт для тестирования API
# Использование: .\test_api_windows.ps1

$API_URL = "http://localhost:8000"

Write-Host "=== API Testing Script ===" -ForegroundColor Green
Write-Host ""

# Test root
Write-Host "1. Testing root endpoint:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/" -Method Get
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test LLM
Write-Host "2. Testing LLM configuration:" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$API_URL/test-llm" -Method Get
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test registration
Write-Host "3. Testing user registration:" -ForegroundColor Yellow
$body = @{
    username = "testuser$(Get-Random)"
    email = "test$(Get-Random)@example.com"
    password = "testpass123"
}
try {
    $response = Invoke-RestMethod -Uri "$API_URL/register" -Method Post -Body $body -ContentType "application/x-www-form-urlencoded"
    Write-Host "Success! Token: $($response.access_token.Substring(0, 20))..." -ForegroundColor Green
    $global:TOKEN = $response.access_token
    $global:USER_ID = $response.user_id
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
Write-Host ""

# Test login
Write-Host "4. Testing user login:" -ForegroundColor Yellow
$loginBody = @{
    username = $body.username
    password = $body.password
}
try {
    $response = Invoke-RestMethod -Uri "$API_URL/token" -Method Post -Body $loginBody -ContentType "application/x-www-form-urlencoded"
    Write-Host "Success! Token received." -ForegroundColor Green
    $global:TOKEN = $response.access_token
    $global:USER_ID = $response.user_id
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test create goal (if we have token)
if ($global:TOKEN) {
    Write-Host "5. Testing create goal:" -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $($global:TOKEN)"
        "Content-Type" = "application/json"
    }
    $goalBody = @{
        title = "Test Goal"
        description = "Test Description"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/goals/?user_id=$($global:USER_ID)" -Method Post -Headers $headers -Body $goalBody
        Write-Host "Success! Goal created with ID: $($response.id)" -ForegroundColor Green
        $global:GOAL_ID = $response.id
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    Write-Host ""
    
    # Test get goals
    Write-Host "6. Testing get goals:" -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/api/goals/?user_id=$($global:USER_ID)" -Method Get -Headers $headers
        Write-Host "Success! Found $($response.Count) goals" -ForegroundColor Green
    } catch {
        Write-Host "Error: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "=== Done ===" -ForegroundColor Green
Write-Host ""
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Cyan
