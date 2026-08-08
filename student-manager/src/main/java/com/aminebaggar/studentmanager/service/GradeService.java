package com.aminebaggar.studentmanager.service;

import com.aminebaggar.studentmanager.dto.GradeDTO;
import com.aminebaggar.studentmanager.dto.TopStudentDTO;
import com.aminebaggar.studentmanager.exception.DuplicateResourceException;
import com.aminebaggar.studentmanager.exception.ResourceNotFoundException;
import com.aminebaggar.studentmanager.model.Course;
import com.aminebaggar.studentmanager.model.Grade;
import com.aminebaggar.studentmanager.model.Student;
import com.aminebaggar.studentmanager.repository.CourseRepository;
import com.aminebaggar.studentmanager.repository.GradeRepository;
import com.aminebaggar.studentmanager.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GradeService {

    private final GradeRepository gradeRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;

    public List<GradeDTO> getGradesByStudent(Long studentId) {
        if (!studentRepository.existsById(studentId)) {
            throw new ResourceNotFoundException("Student", studentId);
        }

        return gradeRepository.findByStudentId(studentId)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public GradeDTO createGrade(GradeDTO dto) {
        Student student = studentRepository.findById(dto.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student", dto.getStudentId()));

        Course course = courseRepository.findById(dto.getCourseId())
                .orElseThrow(() -> new ResourceNotFoundException("Course", dto.getCourseId()));

        // Vérifier qu'il n'y a pas déjà une note pour cet étudiant/cours/semestre
        if (gradeRepository.existsByStudentIdAndCourseIdAndSemester(
                dto.getStudentId(), dto.getCourseId(), dto.getSemester())) {
            throw new DuplicateResourceException(
                    "Grade already exists for student " + dto.getStudentId() +
                    " in course " + dto.getCourseId() +
                    " for semester " + dto.getSemester());
        }

        Grade grade = Grade.builder()
                .student(student)
                .course(course)
                .score(dto.getScore())
                .semester(dto.getSemester())
                .build();

        Grade saved = gradeRepository.save(grade);
        return toDTO(saved);
    }

    @Transactional
    public GradeDTO updateGrade(Long id, GradeDTO dto) {
        Grade grade = gradeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Grade", id));

        grade.setScore(dto.getScore());
        grade.setSemester(dto.getSemester());

        Grade saved = gradeRepository.save(grade);
        return toDTO(saved);
    }

    public List<TopStudentDTO> getTopStudents(int limit) {
        return gradeRepository.findTopStudents(limit)
                .stream()
                .map(row -> TopStudentDTO.builder()
                        .studentId((Long) row[0])
                        .firstName((String) row[1])
                        .lastName((String) row[2])
                        .email((String) row[3])
                        .averageScore(Math.round((Double) row[4] * 100.0) / 100.0)
                        .totalCourses((Long) row[5])
                        .build())
                .collect(Collectors.toList());
    }

    private GradeDTO toDTO(Grade grade) {
        return GradeDTO.builder()
                .id(grade.getId())
                .studentId(grade.getStudent().getId())
                .courseId(grade.getCourse().getId())
                .score(grade.getScore())
                .semester(grade.getSemester())
                .gradedDate(grade.getGradedDate())
                .studentName(grade.getStudent().getFirstName() + " " + grade.getStudent().getLastName())
                .courseName(grade.getCourse().getName())
                .courseCode(grade.getCourse().getCode())
                .build();
    }
}
