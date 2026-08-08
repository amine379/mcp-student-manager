"""
MCP Server for Student Manager API
Exposes the Spring Boot REST API as MCP tools for AI assistants.
"""

import os

import httpx
from mcp.server.fastmcp import FastMCP

# ── Config ──────────────────────────────────────────────
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8080/api")

mcp = FastMCP(
    name="student-manager",
    description="MCP server to manage students, courses, and grades via the Student Manager API",
)


# ── Helper ──────────────────────────────────────────────
async def _request(method: str, path: str, json_body: dict | None = None, params: dict | None = None) -> dict | list | str:
    """Send an HTTP request to the Spring Boot API and return the response."""
    async with httpx.AsyncClient(base_url=API_BASE_URL, timeout=30.0) as client:
        response = await client.request(method, path, json=json_body, params=params)

        if response.status_code == 204:
            return {"status": "success", "message": "Operation completed (no content)"}

        try:
            data = response.json()
        except Exception:
            data = response.text

        if response.status_code >= 400:
            return {"error": True, "status_code": response.status_code, "detail": data}

        return data


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  STUDENT TOOLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@mcp.tool()
async def get_all_students() -> dict | list:
    """Get the list of all students."""
    return await _request("GET", "/students")


@mcp.tool()
async def get_student(student_id: int) -> dict:
    """Get a single student by their ID.

    Args:
        student_id: The ID of the student to retrieve.
    """
    return await _request("GET", f"/students/{student_id}")


@mcp.tool()
async def search_students(name: str) -> dict | list:
    """Search students by first name or last name (case-insensitive).

    Args:
        name: The name (or part of name) to search for.
    """
    return await _request("GET", "/students/search", params={"name": name})


@mcp.tool()
async def create_student(
    first_name: str,
    last_name: str,
    email: str,
    date_of_birth: str | None = None,
) -> dict:
    """Create a new student.

    Args:
        first_name: Student's first name.
        last_name: Student's last name.
        email: Student's email address (must be unique).
        date_of_birth: Date of birth in YYYY-MM-DD format (optional).
    """
    body = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
    }
    if date_of_birth:
        body["dateOfBirth"] = date_of_birth

    return await _request("POST", "/students", json_body=body)


@mcp.tool()
async def update_student(
    student_id: int,
    first_name: str,
    last_name: str,
    email: str,
    date_of_birth: str | None = None,
    status: str | None = None,
) -> dict:
    """Update an existing student.

    Args:
        student_id: The ID of the student to update.
        first_name: Updated first name.
        last_name: Updated last name.
        email: Updated email.
        date_of_birth: Updated date of birth in YYYY-MM-DD format (optional).
        status: Updated status — ACTIVE, INACTIVE, or GRADUATED (optional).
    """
    body = {
        "firstName": first_name,
        "lastName": last_name,
        "email": email,
    }
    if date_of_birth:
        body["dateOfBirth"] = date_of_birth
    if status:
        body["status"] = status

    return await _request("PUT", f"/students/{student_id}", json_body=body)


@mcp.tool()
async def delete_student(student_id: int) -> dict:
    """Delete a student by their ID.

    Args:
        student_id: The ID of the student to delete.
    """
    return await _request("DELETE", f"/students/{student_id}")


@mcp.tool()
async def get_student_report(student_id: int) -> dict:
    """Get a full report for a student: their info, all grades, average score, total credits, and total courses.

    Args:
        student_id: The ID of the student.
    """
    return await _request("GET", f"/students/{student_id}/report")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  COURSE TOOLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@mcp.tool()
async def get_all_courses() -> dict | list:
    """Get the list of all courses."""
    return await _request("GET", "/courses")


@mcp.tool()
async def get_course(course_id: int) -> dict:
    """Get a single course by its ID.

    Args:
        course_id: The ID of the course to retrieve.
    """
    return await _request("GET", f"/courses/{course_id}")


@mcp.tool()
async def create_course(
    name: str,
    code: str,
    credits: int,
    description: str | None = None,
) -> dict:
    """Create a new course.

    Args:
        name: Course name (e.g. "Mathematics").
        code: Unique course code (e.g. "MATH101").
        credits: Number of credits (must be positive).
        description: Course description (optional).
    """
    body = {
        "name": name,
        "code": code,
        "credits": credits,
    }
    if description:
        body["description"] = description

    return await _request("POST", "/courses", json_body=body)


@mcp.tool()
async def update_course(
    course_id: int,
    name: str,
    code: str,
    credits: int,
    description: str | None = None,
) -> dict:
    """Update an existing course.

    Args:
        course_id: The ID of the course to update.
        name: Updated course name.
        code: Updated course code.
        credits: Updated number of credits.
        description: Updated description (optional).
    """
    body = {
        "name": name,
        "code": code,
        "credits": credits,
    }
    if description:
        body["description"] = description

    return await _request("PUT", f"/courses/{course_id}", json_body=body)


@mcp.tool()
async def delete_course(course_id: int) -> dict:
    """Delete a course by its ID.

    Args:
        course_id: The ID of the course to delete.
    """
    return await _request("DELETE", f"/courses/{course_id}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  GRADE TOOLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@mcp.tool()
async def get_student_grades(student_id: int) -> dict | list:
    """Get all grades for a specific student.

    Args:
        student_id: The ID of the student.
    """
    return await _request("GET", f"/grades/student/{student_id}")


@mcp.tool()
async def create_grade(
    student_id: int,
    course_id: int,
    score: float,
    semester: str,
) -> dict:
    """Create a new grade for a student in a course.

    Args:
        student_id: The ID of the student.
        course_id: The ID of the course.
        score: The score between 0.0 and 20.0.
        semester: The semester identifier (e.g. "2025-S1").
    """
    body = {
        "studentId": student_id,
        "courseId": course_id,
        "score": score,
        "semester": semester,
    }
    return await _request("POST", "/grades", json_body=body)


@mcp.tool()
async def update_grade(
    grade_id: int,
    score: float,
    semester: str,
) -> dict:
    """Update an existing grade (score and/or semester).

    Args:
        grade_id: The ID of the grade to update.
        score: The new score (0.0 to 20.0).
        semester: The new semester identifier.
    """
    body = {
        "score": score,
        "semester": semester,
    }
    return await _request("PUT", f"/grades/{grade_id}", json_body=body)


@mcp.tool()
async def get_top_students(limit: int = 10) -> dict | list:
    """Get the top students ranked by their average score.

    Args:
        limit: Maximum number of students to return (default: 10).
    """
    return await _request("GET", "/grades/top", params={"limit": limit})


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  RUN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    mcp.run()
