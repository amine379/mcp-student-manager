package com.aminebaggar.studentmanager.service;

import com.aminebaggar.studentmanager.dto.CourseDTO;
import com.aminebaggar.studentmanager.exception.DuplicateResourceException;
import com.aminebaggar.studentmanager.exception.ResourceNotFoundException;
import com.aminebaggar.studentmanager.model.Course;
import com.aminebaggar.studentmanager.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;

    public List<CourseDTO> getAllCourses() {
        return courseRepository.findAll()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    public CourseDTO getCourseById(Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));
        return toDTO(course);
    }

    @Transactional
    public CourseDTO createCourse(CourseDTO dto) {
        if (courseRepository.existsByCode(dto.getCode())) {
            throw new DuplicateResourceException("A course with code " + dto.getCode() + " already exists");
        }

        Course course = Course.builder()
                .name(dto.getName())
                .code(dto.getCode())
                .description(dto.getDescription())
                .credits(dto.getCredits())
                .build();

        Course saved = courseRepository.save(course);
        return toDTO(saved);
    }

    @Transactional
    public CourseDTO updateCourse(Long id, CourseDTO dto) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course", id));

        course.setName(dto.getName());
        course.setCode(dto.getCode());
        course.setDescription(dto.getDescription());
        course.setCredits(dto.getCredits());

        Course saved = courseRepository.save(course);
        return toDTO(saved);
    }

    @Transactional
    public void deleteCourse(Long id) {
        if (!courseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Course", id);
        }
        courseRepository.deleteById(id);
    }

    private CourseDTO toDTO(Course course) {
        return CourseDTO.builder()
                .id(course.getId())
                .name(course.getName())
                .code(course.getCode())
                .description(course.getDescription())
                .credits(course.getCredits())
                .build();
    }
}
