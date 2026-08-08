# MCP Server — Student Manager

A Python MCP (Model Context Protocol) server that exposes the Student Manager Spring Boot API as tools for AI assistants like Claude.

## Setup

```bash
cd mcp-server
pip install -r requirements.txt
```

## Run

Make sure the Spring Boot backend is running on `http://localhost:8080`, then:

```bash
python server.py
```

Or via the MCP CLI:

```bash
mcp run server.py
```

## Available Tools

### Students
| Tool | Description |
|------|-------------|
| `get_all_students` | List all students |
| `get_student` | Get a student by ID |
| `search_students` | Search by name |
| `create_student` | Create a new student |
| `update_student` | Update a student |
| `delete_student` | Delete a student |
| `get_student_report` | Full report (grades, average, credits) |

### Courses
| Tool | Description |
|------|-------------|
| `get_all_courses` | List all courses |
| `get_course` | Get a course by ID |
| `create_course` | Create a new course |
| `update_course` | Update a course |
| `delete_course` | Delete a course |

### Grades
| Tool | Description |
|------|-------------|
| `get_student_grades` | Get all grades for a student |
| `create_grade` | Add a grade (student + course + score) |
| `update_grade` | Update a grade's score/semester |
| `get_top_students` | Ranked list of top students by average |
