# API Documentation: Create Staff Task

## Endpoint

`POST /api/dashboard/tasks`

Creates a new staff task in Airtable (Tasks table).

---

## Request

- **Content-Type:** `application/json`

### **Body Parameters**
| Field       | Type     | Required | Description                                 |
|-------------|----------|----------|---------------------------------------------|
| title       | string   | Yes      | Task title                                  |
| description | string   | No       | Task details/description                    |
| assignTo    | string   | Yes      | Staff member Airtable record ID             |
| urgency     | string   | Yes      | Task urgency (Very High, High, etc.)        |
| dueDate     | string   | Yes      | Due date (ISO 8601 format, e.g. 2024-06-10) |
| createdBy   | string   | Yes      | Name of the creator                         |

#### **Example Request Body**
```json
{
  "title": "Prepare onboarding documents",
  "description": "Gather all necessary paperwork for new staff.",
  "assignTo": "recXXXXXXXXXXXXXX",
  "urgency": "High",
  "dueDate": "2024-06-10",
  "createdBy": "Jane Smith"
}
```

---

## Field Mapping (Frontend → Airtable)
| Frontend Field | Airtable Field         | Airtable Field ID         |
|----------------|-----------------------|--------------------------|
| title          | 📌 Task               | fldBSR0tivzKCwIYX        |
| description    | 📖 Task Detail        | fld5zfFg0A2Kzfw8W        |
| assignTo       | 👨 Assigned Staff     | fld15xSpsrFIO0ONh        |
| urgency        | 🚨 Urgency            | fldwLSc95ITdPTA7j        |
| dueDate        | 📆 Due Date           | fldJ6mb4TsamGXMFh        |
| createdBy      | 👩 Created By         | fldHx3or8FILZuGE2        |

---

## Response

### **Success (201 Created)**
```json
{
  "task": { /* Airtable record object */ }
}
```

### **Error (400/500)**
```json
{
  "error": "Failed to create task",
  "details": "...error message..."
}
```

---

## Audit Logging
- All task creation attempts are logged in the Website Audit Log table in Airtable, including success/failure, user, and request details.

---

## Example cURL
```sh
curl -X POST https://yourdomain.com/api/dashboard/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Prepare onboarding documents",
    "description": "Gather all necessary paperwork for new staff.",
    "assignTo": "recXXXXXXXXXXXXXX",
    "urgency": "High",
    "dueDate": "2024-06-10",
    "createdBy": "Jane Smith"
  }'
``` 