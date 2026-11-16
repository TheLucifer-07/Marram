package com.marram.exception;

/** The caller is authenticated and inside the workspace, but their role does not allow the operation (HTTP 403). */
public class UnauthorizedOperationException extends RuntimeException {
    public UnauthorizedOperationException(String message) { super(message); }
}
