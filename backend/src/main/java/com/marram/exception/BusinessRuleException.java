package com.marram.exception;

/** A well-formed request that the current state of the data does not allow (HTTP 409). */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) { super(message); }
}
