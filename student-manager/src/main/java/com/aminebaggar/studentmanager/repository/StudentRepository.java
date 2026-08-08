package com.aminebaggar.studentmanager.repository;

import com.aminebaggar.studentmanager.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    // Chercher par nom ou prénom (case insensitive)
    List<Student> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName, String lastName);

    // Vérifier si un email existe déjà
    Optional<Student> findByEmail(String email);

    boolean existsByEmail(String email);
}
