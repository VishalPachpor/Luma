#!/bin/bash

# End-to-End Testing Helper Script
# This script helps automate common testing flows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000}"
INNGEST_URL="${INNGEST_URL:-http://localhost:8288}"

# Helper functions
print_header() {
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}$1${NC}"
    echo -e "${GREEN}========================================${NC}\n"
}

print_error() {
    echo -e "${RED}❌ Error: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if API is running
check_api() {
    print_info "Checking if API is running..."
    if curl -s -f "$API_BASE_URL/api/events" > /dev/null 2>&1; then
        print_success "API is running"
        return 0
    else
        print_error "API is not running. Please start with: npm run dev"
        return 1
    fi
}

# Check if Inngest is running
check_inngest() {
    print_info "Checking if Inngest is running..."
    if curl -s -f "$INNGEST_URL/api/health" > /dev/null 2>&1; then
        print_success "Inngest is running"
        return 0
    else
        print_error "Inngest is not running. Please start with: npm run dev:all"
        return 1
    fi
}

# Test event creation via API
test_create_event() {
    print_header "Testing Event Creation"
    
    if [ -z "$1" ]; then
        print_error "Event ID required"
        return 1
    fi
    
    EVENT_ID=$1
    print_info "Testing with event ID: $EVENT_ID"
    
    # Get event details
    RESPONSE=$(curl -s "$API_BASE_URL/api/events/$EVENT_ID")
    
    if echo "$RESPONSE" | grep -q "error"; then
        print_error "Event not found: $EVENT_ID"
        return 1
    else
        print_success "Event found"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 0
    fi
}

# Test guest registration
test_guest_status() {
    print_header "Testing Guest Status"
    
    if [ -z "$1" ] || [ -z "$2" ]; then
        print_error "Event ID and Guest ID required"
        echo "Usage: test_guest_status <eventId> <guestId>"
        return 1
    fi
    
    EVENT_ID=$1
    GUEST_ID=$2
    
    print_info "Checking guest status..."
    
    # This would require database access or API endpoint
    print_info "Guest ID: $GUEST_ID"
    print_info "Event ID: $EVENT_ID"
    print_info "Check database: SELECT * FROM guests WHERE id = '$GUEST_ID';"
}

# Test escrow stake verification
test_escrow_stake() {
    print_header "Testing Escrow Stake Verification"
    
    if [ -z "$1" ] || [ -z "$2" ]; then
        print_error "Event ID and Wallet Address required"
        echo "Usage: test_escrow_stake <eventId> <walletAddress>"
        return 1
    fi
    
    EVENT_ID=$1
    WALLET_ADDRESS=$2
    
    print_info "Checking stake status..."
    
    RESPONSE=$(curl -s "$API_BASE_URL/api/escrow/stake?eventId=$EVENT_ID&walletAddress=$WALLET_ADDRESS")
    
    if echo "$RESPONSE" | grep -q "error"; then
        print_error "Stake check failed"
        echo "$RESPONSE"
        return 1
    else
        print_success "Stake status retrieved"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 0
    fi
}

# Test check-in
test_checkin() {
    print_header "Testing Check-in"
    
    if [ -z "$1" ] || [ -z "$2" ]; then
        print_error "QR Token and Event ID required"
        echo "Usage: test_checkin <qrToken> <eventId>"
        return 1
    fi
    
    QR_TOKEN=$1
    EVENT_ID=$2
    
    print_info "Checking in guest..."
    
    RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/checkin" \
        -H "Content-Type: application/json" \
        -d "{\"qrToken\":\"$QR_TOKEN\",\"eventId\":\"$EVENT_ID\"}")
    
    if echo "$RESPONSE" | grep -q "error"; then
        print_error "Check-in failed"
        echo "$RESPONSE"
        return 1
    else
        print_success "Check-in successful"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        return 0
    fi
}

# Run escrow test script
run_escrow_tests() {
    print_header "Running Escrow Tests"
    
    if [ ! -f "test-escrow-flow.ts" ]; then
        print_error "test-escrow-flow.ts not found"
        return 1
    fi
    
    if [ -z "$TEST_EVENT_ID" ] || [ -z "$TEST_GUEST_ID" ]; then
        print_error "TEST_EVENT_ID and TEST_GUEST_ID must be set"
        return 1
    fi
    
    print_info "Running escrow test script..."
    npx tsx test-escrow-flow.ts
}

# Check environment variables
check_env() {
    print_header "Checking Environment Variables"
    
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
    )
    
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -eq 0 ]; then
        print_success "All required environment variables are set"
        return 0
    else
        print_error "Missing environment variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        return 1
    fi
}

# Main menu
show_menu() {
    echo -e "\n${GREEN}PlanX End-to-End Testing Helper${NC}"
    echo "=================================="
    echo "1. Check API Status"
    echo "2. Check Inngest Status"
    echo "3. Check Environment Variables"
    echo "4. Test Event Creation"
    echo "5. Test Guest Status"
    echo "6. Test Escrow Stake"
    echo "7. Test Check-in"
    echo "8. Run Escrow Tests"
    echo "9. Run All Checks"
    echo "0. Exit"
    echo ""
    read -p "Select option: " choice
    
    case $choice in
        1)
            check_api
            ;;
        2)
            check_inngest
            ;;
        3)
            check_env
            ;;
        4)
            read -p "Enter Event ID: " event_id
            test_create_event "$event_id"
            ;;
        5)
            read -p "Enter Event ID: " event_id
            read -p "Enter Guest ID: " guest_id
            test_guest_status "$event_id" "$guest_id"
            ;;
        6)
            read -p "Enter Event ID: " event_id
            read -p "Enter Wallet Address: " wallet
            test_escrow_stake "$event_id" "$wallet"
            ;;
        7)
            read -p "Enter QR Token: " qr_token
            read -p "Enter Event ID: " event_id
            test_checkin "$qr_token" "$event_id"
            ;;
        8)
            run_escrow_tests
            ;;
        9)
            check_api
            check_inngest
            check_env
            ;;
        0)
            echo "Goodbye!"
            exit 0
            ;;
        *)
            print_error "Invalid option"
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

# Command line usage
if [ $# -eq 0 ]; then
    show_menu
else
    case $1 in
        check-api)
            check_api
            ;;
        check-inngest)
            check_inngest
            ;;
        check-env)
            check_env
            ;;
        test-event)
            test_create_event "$2"
            ;;
        test-guest)
            test_guest_status "$2" "$3"
            ;;
        test-stake)
            test_escrow_stake "$2" "$3"
            ;;
        test-checkin)
            test_checkin "$2" "$3"
            ;;
        escrow)
            run_escrow_tests
            ;;
        *)
            echo "Usage: $0 [command] [args...]"
            echo ""
            echo "Commands:"
            echo "  check-api              - Check if API is running"
            echo "  check-inngest          - Check if Inngest is running"
            echo "  check-env              - Check environment variables"
            echo "  test-event <eventId>   - Test event creation"
            echo "  test-guest <eventId> <guestId> - Test guest status"
            echo "  test-stake <eventId> <wallet>  - Test escrow stake"
            echo "  test-checkin <qrToken> <eventId> - Test check-in"
            echo "  escrow                 - Run escrow tests"
            echo ""
            echo "Or run without arguments for interactive menu"
            exit 1
            ;;
    esac
fi
