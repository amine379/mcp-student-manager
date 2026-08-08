package com.aminebaggar.studentmanager.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopStudentDTO {

    private Long studentId;
    private String firstName;
    private String lastName;
    private String email;
    private Double averageScore;
    private Long totalCourses;
}
