package com.aminebaggar.studentmanager.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "grades")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Grade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @DecimalMin(value = "0.0", message = "Score must be at least 0")
    @DecimalMax(value = "20.0", message = "Score must be at most 20")
    @Column(nullable = false)
    private Double score;

    @NotBlank(message = "Semester is required")
    @Column(nullable = false)
    private String semester;

    @Column(nullable = false)
    @Builder.Default
    private LocalDate gradedDate = LocalDate.now();
}
