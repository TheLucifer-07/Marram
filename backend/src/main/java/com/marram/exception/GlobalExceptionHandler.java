package com.marram.exception;

import jakarta.persistence.OptimisticLockException;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** One place that turns every failure into an RFC 9457 problem document. Stack traces never reach clients. */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    static ResponseEntity<ProblemDetail> problem(HttpStatus status, String title, String detail, HttpServletRequest req) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(status, detail);
        pd.setTitle(title);
        pd.setType(URI.create("about:blank"));
        pd.setInstance(URI.create(req.getRequestURI()));
        return ResponseEntity.status(status).body(pd);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ProblemDetail> notFound(ResourceNotFoundException e, HttpServletRequest r) {
        return problem(HttpStatus.NOT_FOUND, "Not Found", e.getMessage(), r);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ProblemDetail> noResource(NoResourceFoundException e, HttpServletRequest r) {
        return problem(HttpStatus.NOT_FOUND, "Not Found", "No such endpoint", r);
    }

    @ExceptionHandler({UnauthorizedOperationException.class, AccessDeniedException.class})
    ResponseEntity<ProblemDetail> forbidden(RuntimeException e, HttpServletRequest r) {
        String detail = e instanceof UnauthorizedOperationException ? e.getMessage() : "You do not have permission to do that";
        return problem(HttpStatus.FORBIDDEN, "Forbidden", detail, r);
    }

    @ExceptionHandler({DuplicateResourceException.class, InvalidTaskTransitionException.class, BusinessRuleException.class})
    ResponseEntity<ProblemDetail> conflict(RuntimeException e, HttpServletRequest r) {
        String title = e instanceof InvalidTaskTransitionException ? "Invalid Task Transition" : "Conflict";
        return problem(HttpStatus.CONFLICT, title, e.getMessage(), r);
    }

    @ExceptionHandler(InvalidWorkspaceMembershipException.class)
    ResponseEntity<ProblemDetail> badMembership(InvalidWorkspaceMembershipException e, HttpServletRequest r) {
        return problem(HttpStatus.BAD_REQUEST, "Invalid Membership", e.getMessage(), r);
    }

    @ExceptionHandler(BadRequestException.class)
    ResponseEntity<ProblemDetail> badRequest(BadRequestException e, HttpServletRequest r) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request", e.getMessage(), r);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> invalid(MethodArgumentNotValidException e, HttpServletRequest r) {
        ResponseEntity<ProblemDetail> res = problem(HttpStatus.BAD_REQUEST, "Validation Failed", "Request validation failed", r);
        List<Map<String, String>> errors = e.getBindingResult().getFieldErrors().stream()
                .map(f -> Map.of("field", f.getField(), "message", String.valueOf(f.getDefaultMessage())))
                .toList();
        res.getBody().setProperty("errors", errors);
        return res;
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    ResponseEntity<ProblemDetail> malformed(Exception e, HttpServletRequest r) {
        return problem(HttpStatus.BAD_REQUEST, "Bad Request", "The request is malformed or has an invalid value", r);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ProblemDetail> method(HttpRequestMethodNotSupportedException e, HttpServletRequest r) {
        return problem(HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed", "That method is not supported here", r);
    }

    @ExceptionHandler({ObjectOptimisticLockingFailureException.class, OptimisticLockException.class})
    ResponseEntity<ProblemDetail> locked(Exception e, HttpServletRequest r) {
        return problem(HttpStatus.CONFLICT, "Conflict", "Someone else changed this item at the same time. Reload and try again", r);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemDetail> integrity(DataIntegrityViolationException e, HttpServletRequest r) {
        log.warn("Data integrity violation on {}: {}", r.getRequestURI(), e.getMostSpecificCause().getMessage());
        return problem(HttpStatus.CONFLICT, "Conflict", "The change conflicts with existing data", r);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception e, HttpServletRequest r) {
        log.error("Unhandled error on {} {}", r.getMethod(), r.getRequestURI(), e);
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error", "An unexpected error occurred", r);
    }
}
