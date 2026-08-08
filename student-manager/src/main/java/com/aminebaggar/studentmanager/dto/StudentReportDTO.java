package com.aminebaggar.studentmanager.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentReportDTO {

    private StudentDTO student;
    private List<GradeDetail> courses;
    private Double averageScore;
    private Integer totalCredits;
    private Integer totalCourses;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GradeDetail {
        private String courseName;
        private String courseCode;
        private Double score;
        private String semester;
        private Integer credits;
    }
}
