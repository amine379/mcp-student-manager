package com.aminebaggar.studentmanager.controller;

import com.aminebaggar.studentmanager.dto.GradeDTO;
import com.aminebaggar.studentmanager.dto.TopStudentDTO;
import com.aminebaggar.studentmanager.service.GradeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grades")
@RequiredArgsConstructor
public class GradeController {

    private final GradeService gradeService;

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<GradeDTO>> getGradesByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(gradeService.getGradesByStudent(studentId));
    }

    @PostMapping
    public ResponseEntity<GradeDTO> createGrade(@Valid @RequestBody GradeDTO dto) {
        GradeDTO created = gradeService.createGrade(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GradeDTO> updateGrade(
            @PathVariable Long id,
            @Valid @RequestBody GradeDTO dto) {
        return ResponseEntity.ok(gradeService.updateGrade(id, dto));
    }

    @GetMapping("/top")
    public ResponseEntity<List<TopStudentDTO>> getTopStudents(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(gradeService.getTopStudents(limit));
    }
}
