package com.aminebaggar.studentmanager.service;

import com.aminebaggar.studentmanager.dto.StudentDTO;
import com.aminebaggar.studentmanager.dto.StudentReportDTO;
import com.aminebaggar.studentmanager.exception.DuplicateResourceException;
import com.aminebaggar.studentmanager.exception.ResourceNotFoundException;
import com.aminebaggar.studentmanager.model.Grade;
import com.aminebaggar.studentmanager.model.Student;
import com.aminebaggar.studentmanager.model.StudentStatus;
import com.aminebaggar.studentmanager.repository.GradeRepository;
import com.aminebaggar.studentmanager.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final GradeRepository gradeRepository;

    public List<StudentDTO> getAllStudents() {
        return studentRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public StudentDTO getStudentById(Long id) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", id));
        return toDTO(student);
    }

    public List<StudentDTO> searchStudents(String name) {
        return studentRepository
                .findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(name, name)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public StudentDTO createStudent(StudentDTO dto) {
        // Vérifier si l'email existe déjà
        if (studentRepository.existsByEmail(dto.getEmail())) {
            throw new DuplicateResourceException("A student with email " + dto.getEmail() + " already exists");
        }

        Student student = Student.builder()
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .email(dto.getEmail())
                .dateOfBirth(dto.getDateOfBirth())
                .build();

        Student saved = studentRepository.save(student);
        return toDTO(saved);
    }

    @Transactional
    public StudentDTO updateStudent(Long id, StudentDTO dto) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student", id));

        student.setFirstName(dto.getFirstName());
        student.setLastName(dto.getLastName());
        student.setEmail(dto.getEmail());
        student.setDateOfBirth(dto.getDateOfBirth());

        if (dto.getStatus() != null) {
            student.setStatus(StudentStatus.valueOf(dto.getStatus()));
        }

        Student saved = studentRepository.save(student);
        return toDTO(saved);
    }

    @Transactional
    public void deleteStudent(Long id) {
        if (!studentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Student", id);
        }
        studentRepository.deleteById(id);
    }

    // ===== LE RAPPORT — l'endpoint star =====
    public StudentReportDTO getStudentReport(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", studentId));

        List<Grade> grades = gradeRepository.findByStudentId(studentId);

        List<StudentReportDTO.GradeDetail> gradeDetails = grades.stream()
                .map(g -> StudentReportDTO.GradeDetail.builder()
                        .courseName(g.getCourse().getName())
                        .courseCode(g.getCourse().getCode())
                        .score(g.getScore())
                        .semester(g.getSemester())
                        .credits(g.getCourse().getCredits())
                        .build())
                .collect(Collectors.toList());

        // Calculer la moyenne
        Double average = grades.stream()
                .mapToDouble(Grade::getScore)
                .average()
                .orElse(0.0);

        // Calculer le total des crédits
        Integer totalCredits = grades.stream()
                .map(g -> g.getCourse().getCredits())
                .reduce(0, Integer::sum);

        return StudentReportDTO.builder()
                .student(toDTO(student))
                .courses(gradeDetails)
                .averageScore(Math.round(average * 100.0) / 100.0)
                .totalCredits(totalCredits)
                .totalCourses(grades.size())
                .build();
    }

    // ===== Mapper Entity → DTO =====
    private StudentDTO toDTO(Student student) {
        return StudentDTO.builder()
                .id(student.getId())
                .firstName(student.getFirstName())
                .lastName(student.getLastName())
                .email(student.getEmail())
                .dateOfBirth(student.getDateOfBirth())
                .enrollmentDate(student.getEnrollmentDate())
                .status(student.getStatus().name())
                .build();
    }
}
