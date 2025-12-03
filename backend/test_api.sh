#!/bin/bash

# API Testing Script for AI Goal Tracker
# Usage: ./test_api.sh [endpoint_name]
# Or run without arguments to test all endpoints

API_URL="http://localhost:8000"
USER_ID=1
GOAL_ID=1
CHAT_ID=1
MILESTONE_ID=1

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

echo_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

echo_error() {
    echo -e "${RED}✗ $1${NC}"
}

test_root() {
    echo_info "Testing root endpoint..."
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}\nTIME:%{time_total}" "$API_URL/" 2>&1)
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    time_total=$(echo "$response" | grep "TIME" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d' | sed '/TIME/d')
    
    if [ "$http_status" = "200" ] && echo "$body" | grep -q "message"; then
        echo_success "Root endpoint works (HTTP $http_status, ${time_total}s)"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo_error "Root endpoint failed (HTTP $http_status)"
        if [ -z "$http_status" ] || [ "$http_status" = "000" ]; then
            echo_error "Backend is not running! Start it with: cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
        fi
        echo "$body"
    fi
    echo ""
}

test_create_goal() {
    echo_info "Testing create goal..."
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/goals/?user_id=$USER_ID" \
        -H "Content-Type: application/json" \
        -d '{"title":"Test Goal from API Test","description":"Test description"}')
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    if [ "$http_status" = "200" ] && echo "$body" | grep -q "id"; then
        echo_success "Goal created (HTTP $http_status)"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
        GOAL_ID=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "1")
    else
        echo_error "Failed to create goal (HTTP $http_status)"
        echo "$body"
    fi
    echo ""
}

test_get_goals() {
    echo_info "Testing get goals for user $USER_ID..."
    response=$(curl -s "$API_URL/api/goals/?user_id=$USER_ID")
    if echo "$response" | grep -q "\["; then
        echo_success "Goals retrieved"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo_error "Failed to get goals"
        echo "$response"
    fi
    echo ""
}

test_create_milestone() {
    echo_info "Testing create milestone for goal $GOAL_ID..."
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/milestones/" \
        -H "Content-Type: application/json" \
        -d "{\"title\":\"Test Milestone\",\"goal_id\":$GOAL_ID}")
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    if [ "$http_status" = "200" ] && echo "$body" | grep -q "id"; then
        echo_success "Milestone created (HTTP $http_status)"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
        MILESTONE_ID=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "1")
    else
        echo_error "Failed to create milestone (HTTP $http_status)"
        echo "$body"
    fi
    echo ""
}

test_get_milestones() {
    echo_info "Testing get milestones for goal $GOAL_ID..."
    response=$(curl -s "$API_URL/api/milestones/?goal_id=$GOAL_ID")
    if echo "$response" | grep -q "\["; then
        echo_success "Milestones retrieved"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo_error "Failed to get milestones"
        echo "$response"
    fi
    echo ""
}

test_create_chat() {
    echo_info "Testing create chat for goal $GOAL_ID..."
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/chats/" \
        -H "Content-Type: application/json" \
        -d "{\"goal_id\":$GOAL_ID}")
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    if [ "$http_status" = "200" ] && echo "$body" | grep -q "id"; then
        echo_success "Chat created (HTTP $http_status)"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
        CHAT_ID=$(echo "$body" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "1")
    else
        echo_error "Failed to create chat (HTTP $http_status)"
        echo "$body"
    fi
    echo ""
}

test_get_chats() {
    echo_info "Testing get chats for goal $GOAL_ID..."
    response=$(curl -s "$API_URL/api/chats/?goal_id=$GOAL_ID")
    if echo "$response" | grep -q "\["; then
        echo_success "Chats retrieved"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
        if [ -z "$CHAT_ID" ] || [ "$CHAT_ID" = "1" ]; then
            CHAT_ID=$(echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else 1)" 2>/dev/null || echo "1")
        fi
    else
        echo_error "Failed to get chats"
        echo "$response"
    fi
    echo ""
}

test_send_message() {
    echo_info "Testing send message to chat $CHAT_ID..."
    response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$API_URL/api/chats/$CHAT_ID/messages/" \
        -H "Content-Type: application/json" \
        -d '{"content":"Hello from API test","sender":"user"}' 2>&1)
    http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTP_STATUS/d')
    
    echo "Response (HTTP $http_status):"
    echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    
    if [ "$http_status" = "200" ] && echo "$body" | grep -q "id"; then
        echo_success "Message sent"
    else
        echo_error "Failed to send message"
        if [ -z "$http_status" ] || [ "$http_status" = "000" ]; then
            echo_error "Backend is not running or connection failed!"
        fi
    fi
    echo ""
}

test_get_messages() {
    echo_info "Testing get messages from chat $CHAT_ID..."
    response=$(curl -s "$API_URL/api/chats/$CHAT_ID/messages/")
    if echo "$response" | grep -q "\["; then
        echo_success "Messages retrieved"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo_error "Failed to get messages"
        echo "$response"
    fi
    echo ""
}

test_update_milestone() {
    echo_info "Testing update milestone $MILESTONE_ID..."
    response=$(curl -s -X PUT "$API_URL/api/milestones/$MILESTONE_ID" \
        -H "Content-Type: application/json" \
        -d '{"completed":true}')
    if echo "$response" | grep -q "id"; then
        echo_success "Milestone updated"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        echo_error "Failed to update milestone"
        echo "$response"
    fi
    echo ""
}

# Main execution
if [ "$1" = "root" ]; then
    test_root
elif [ "$1" = "goal" ]; then
    test_create_goal
    test_get_goals
elif [ "$1" = "milestone" ]; then
    test_create_milestone
    test_get_milestones
    test_update_milestone
elif [ "$1" = "chat" ]; then
    test_create_chat
    test_get_chats
    test_send_message
    sleep 2  # Wait for AI response
    test_get_messages
elif [ "$1" = "all" ] || [ -z "$1" ]; then
    echo "=== Testing All API Endpoints ==="
    echo ""
    test_root
    test_create_goal
    test_get_goals
    test_create_milestone
    test_get_milestones
    test_create_chat
    test_get_chats
    test_send_message
    sleep 3  # Wait for AI response
    test_get_messages
    test_update_milestone
    echo "=== Testing Complete ==="
else
    echo "Usage: $0 [root|goal|milestone|chat|all]"
    echo "  root      - Test root endpoint"
    echo "  goal      - Test goal endpoints"
    echo "  milestone - Test milestone endpoints"
    echo "  chat      - Test chat endpoints"
    echo "  all       - Test all endpoints (default)"
fi

