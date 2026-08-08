package com.aminebaggar.studentmanager.repository;

import com.aminebaggar.studentmanager.model.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GradeRepository extends JpaRepository<Grade, Long> {

    // Notes d'un étudiant
    List<Grade> findByStudentId(Long studentId);

    // Notes par cours
    List<Grade> findByCourseId(Long courseId);

    // Top étudiants par moyenne — requête custom JPQL
    @Query("SELECT g.student.id, g.student.firstName, g.student.lastName, " +
           "g.student.email, AVG(g.score), COUNT(g.course) " +
           "FROM Grade g " +
           "GROUP BY g.student.id, g.student.firstName, g.student.lastName, g.student.email " +
           "ORDER BY AVG(g.score) DESC " +
           "LIMIT :limit")
    List<Object[]> findTopStudents(@Param("limit") int limit);

    // Vérifier si une note existe déjà pour un étudiant dans un cours et semestre
    boolean existsByStudentIdAndCourseIdAndSemester(Long studentId, Long courseId, String semester);
}
