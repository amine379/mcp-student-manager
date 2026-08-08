package com.aminebaggar.studentmanager.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeDTO {

    private Long id;

    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @DecimalMin(value = "0.0", message = "Score must be at least 0")
    @DecimalMax(value = "20.0", message = "Score must be at most 20")
    private Double score;

    @NotBlank(message = "Semester is required")
    private String semester;

    private LocalDate gradedDate;

    // Extra fields for responses
    private String studentName;
    private String courseName;
    private String courseCode;
}
