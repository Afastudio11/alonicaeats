#!/bin/bash

echo "🧪 Testing Upload Functionality on VPS"
echo "========================================"
echo ""

# 1. Check directories
echo "📁 Step 1: Checking directories..."
if [ -d "uploads" ] && [ -d "public/images" ]; then
    echo "✅ Directories exist:"
    ls -ld uploads public/images
else
    echo "❌ Directories missing! Creating..."
    mkdir -p uploads public/images
    chmod 755 uploads public public/images
    echo "✅ Created:"
    ls -ld uploads public/images
fi
echo ""

# 2. Check write permissions
echo "🔐 Step 2: Testing write permissions..."
TEST_FILE="uploads/test-$(date +%s).txt"
if echo "test" > "$TEST_FILE" 2>/dev/null; then
    echo "✅ Can write to uploads/"
    rm "$TEST_FILE"
else
    echo "❌ Cannot write to uploads/ - Permission denied!"
    echo "Fix with: chmod 755 uploads"
fi

TEST_FILE="public/images/test-$(date +%s).txt"
if echo "test" > "$TEST_FILE" 2>/dev/null; then
    echo "✅ Can write to public/images/"
    rm "$TEST_FILE"
else
    echo "❌ Cannot write to public/images/ - Permission denied!"
    echo "Fix with: chmod 755 public/images"
fi
echo ""

# 3. Check if PM2 is running
echo "🔄 Step 3: Checking PM2 status..."
if pm2 list | grep -q "alonica"; then
    echo "✅ PM2 is running"
    pm2 list | grep alonica
else
    echo "❌ PM2 not running!"
    echo "Start with: pm2 restart all"
fi
echo ""

# 4. Check Nginx config
echo "🌐 Step 4: Checking Nginx config..."
if sudo nginx -T 2>/dev/null | grep -q "client_max_body_size"; then
    echo "✅ Nginx client_max_body_size configured:"
    sudo nginx -T 2>/dev/null | grep client_max_body_size | head -3
else
    echo "⚠️  Nginx client_max_body_size not found"
    echo "Add to Nginx config:"
    echo "    client_max_body_size 20M;"
fi
echo ""

# 5. Test API endpoint (if curl is available)
echo "🔌 Step 5: Testing upload endpoint..."
TOKEN_FILE=~/.alonica-token
if [ -f "$TOKEN_FILE" ]; then
    TOKEN=$(cat "$TOKEN_FILE")
    echo "Found token, testing API..."
    
    # Create a small test image
    if command -v convert &> /dev/null; then
        convert -size 100x100 xc:red /tmp/test-upload.jpg 2>/dev/null
        
        RESPONSE=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $TOKEN" \
            -F "file=@/tmp/test-upload.jpg" \
            http://localhost:3000/api/objects/upload)
        
        HTTP_CODE=$(echo "$RESPONSE" | tail -1)
        BODY=$(echo "$RESPONSE" | head -n -1)
        
        echo "Response Code: $HTTP_CODE"
        echo "Response Body: $BODY"
        
        if [ "$HTTP_CODE" = "200" ]; then
            echo "✅ Upload endpoint working!"
            
            # Extract image path from response
            IMAGE_PATH=$(echo "$BODY" | grep -o '"/images/[^"]*"' | tr -d '"')
            if [ -n "$IMAGE_PATH" ]; then
                echo "Image URL: $IMAGE_PATH"
                
                # Check if file exists
                FILE_PATH="public${IMAGE_PATH}"
                if [ -f "$FILE_PATH" ]; then
                    echo "✅ File saved at: $FILE_PATH"
                    ls -lh "$FILE_PATH"
                else
                    echo "❌ File NOT found at: $FILE_PATH"
                fi
            fi
        else
            echo "❌ Upload failed with code $HTTP_CODE"
        fi
        
        rm /tmp/test-upload.jpg 2>/dev/null
    else
        echo "⚠️  ImageMagick not installed, skipping API test"
        echo "Install with: sudo apt-get install imagemagick"
    fi
else
    echo "⚠️  No auth token found"
    echo "Login via browser first, then save token to $TOKEN_FILE"
fi
echo ""

# 6. Summary
echo "📊 Summary & Next Steps"
echo "======================="
echo ""
echo "If all checks passed (✅):"
echo "  1. Try uploading via admin dashboard"
echo "  2. Open browser DevTools (F12) → Console"
echo "  3. Look for 'Upload response:' log"
echo "  4. Check the image URL returned"
echo ""
echo "If upload still fails:"
echo "  1. Check PM2 logs: pm2 logs --lines 50"
echo "  2. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "  3. Verify file is saved: ls -la public/images/"
echo "  4. Test image URL directly: curl -I https://yourdomain.com/images/filename.jpg"
