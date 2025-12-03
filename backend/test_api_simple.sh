#!/bin/bash
# Simple API testing - always shows full response

API_URL="http://localhost:8000"

echo "=== API Testing Script ==="
echo ""

# Test root
echo "1. Testing root endpoint:"
curl -s "$API_URL/" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/"
echo -e "\n"

# Test create goal
echo "2. Testing create goal:"
curl -s -X POST "$API_URL/api/goals/?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Goal","description":"Test"}' | python3 -m json.tool 2>/dev/null || \
curl -s -X POST "$API_URL/api/goals/?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Goal","description":"Test"}'
echo -e "\n"

# Test get goals
echo "3. Testing get goals:"
curl -s "$API_URL/api/goals/?user_id=1" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/api/goals/?user_id=1"
echo -e "\n"

# Test create chat
echo "4. Testing create chat:"
curl -s -X POST "$API_URL/api/chats/" \
  -H "Content-Type: application/json" \
  -d '{"goal_id":1}' | python3 -m json.tool 2>/dev/null || \
curl -s -X POST "$API_URL/api/chats/" \
  -H "Content-Type: application/json" \
  -d '{"goal_id":1}'
echo -e "\n"

# Test send message
echo "5. Testing send message (chat_id=1):"
curl -s -X POST "$API_URL/api/chats/1/messages/" \
  -H "Content-Type: application/json" \
  -d '{"content":"test","sender":"user"}' | python3 -m json.tool 2>/dev/null || \
curl -s -X POST "$API_URL/api/chats/1/messages/" \
  -H "Content-Type: application/json" \
  -d '{"content":"test","sender":"user"}'
echo -e "\n"

# Test get messages
echo "6. Testing get messages:"
curl -s "$API_URL/api/chats/1/messages/" | python3 -m json.tool 2>/dev/null || curl -s "$API_URL/api/chats/1/messages/"
echo -e "\n"

echo "=== Done ==="

