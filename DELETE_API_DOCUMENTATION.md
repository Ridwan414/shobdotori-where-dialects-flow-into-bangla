# Delete Dialect API Documentation

## Overview
This API endpoint allows you to delete all recordings for a specific dialect from both the database and Google Drive storage.

## Endpoint
```
DELETE /api/dialect
```

## Request
- **Method**: DELETE
- **Content-Type**: application/json
- **Body**: JSON object with dialectName field

### Request Body
```json
{
  "dialectName": "dhaka"
}
```

## Response
### Success Response (200)
```json
{
  "success": true,
  "message": "Successfully deleted all data for dialect: dhaka",
  "summary": {
    "dialectCode": "dhaka",
    "dialectName": "Dhaka",
    "deletedRecordings": 15,
    "deletedFiles": 15,
    "failedFiles": 0,
    "errors": undefined
  }
}
```

### Error Responses
#### 400 - Bad Request
```json
{
  "success": false,
  "error": "dialectName is required in request body"
}
```

#### 400 - Invalid Dialect Name
```json
{
  "success": false,
  "error": "Invalid dialect name. Must be one of: dhaka, chittagong, rajshahi, ..."
}
```

#### 404 - Dialect Not Found
```json
{
  "success": false,
  "error": "Dialect not found in database"
}
```

#### 500 - Server Error
```json
{
  "success": false,
  "error": "Failed to delete dialect data",
  "details": "Error message details"
}
```

## Valid Dialect Names

You must use one of these **exact** dialect names in the request body:

### Divisions (বিভাগসমূহ)
1. **dhaka** - ঢাকা
2. **chittagong** - চট্টগ্রাম  
3. **rajshahi** - রাজশাহী
4. **khulna** - খুলনা
5. **barisal** - বরিশাল
6. **sylhet** - সিলেট
7. **rangpur** - রংপুর
8. **mymensingh** - ময়মনসিংহ

### Regions (অঞ্চলসমূহ)
9. **noakhali** - নোয়াখালী
10. **comilla** - কুমিল্লা
11. **feni** - ফেনী
12. **brahmanbaria** - ব্রাহ্মণবাড়িয়া
13. **sandwip** - সন্দ্বীপ
14. **chandpur** - চাঁদপুর
15. **lakshmipur** - লক্ষ্মীপুর
16. **bhola** - ভোলা
17. **patuakhali** - পটুয়াখালী
18. **bagerhat** - বাগেরহাট
19. **jessore** - যশোর
20. **kushtia** - কুষ্টিয়া
21. **jhenaidah** - ঝিনাইদহ
22. **gaibandha** - গাইবান্ধা
23. **kurigram** - কুড়িগ্রাম
24. **panchagarh** - পঞ্চগড়
25. **lalmonirhat** - লালমনিরহাট
26. **dinajpur** - দিনাজপুর
27. **natore** - নাটোর
28. **pabna** - পাবনা
29. **sirajganj** - সিরাজগঞ্জ
30. **bogura** - বগুড়া

## Example Usage

### Using cURL
```bash
curl -X DELETE http://localhost:3000/api/dialect \
  -H "Content-Type: application/json" \
  -d '{"dialectName": "dhaka"}'
```

### Using JavaScript (fetch)
```javascript
const response = await fetch('/api/dialect', {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    dialectName: 'dhaka'
  })
});

const result = await response.json();
console.log(result);
```

### Using Postman
1. Set method to **DELETE**
2. URL: `http://localhost:3000/api/dialect`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
   ```json
   {
     "dialectName": "dhaka"
   }
   ```

## What This API Does

1. **Validates** the dialect name against the 30 supported dialects
2. **Finds** the dialect in the database
3. **Deletes** all audio files from Google Drive for this dialect
4. **Removes** all recording entries from the database
5. **Resets** the dialect progress (marks all sentences as unrecorded)
6. **Deletes** the empty dialect folder from Google Drive (if possible)
7. **Returns** a summary of the deletion process

## Important Notes

- ⚠️ **This action is irreversible!** All recordings for the dialect will be permanently deleted.
- The dialect name is **case-insensitive** (both "dhaka" and "Dhaka" work)
- Extra spaces are automatically trimmed
- The dialect folder in Google Drive is only deleted if it becomes empty
- If some files fail to delete from Google Drive, the API will still proceed and report the errors
- The dialect remains in the system but with zero recordings (ready for new recordings)

## Error Handling

The API provides detailed error reporting:
- Individual file deletion failures are logged but don't stop the process
- Failed operations are reported in the response
- Database operations are wrapped in try-catch blocks
- Google Drive operations have individual error handling

This ensures maximum data cleanup even if some operations fail. 