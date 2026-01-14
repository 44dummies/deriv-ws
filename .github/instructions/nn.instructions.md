---
applyTo: '**'
description: |
  Follow clear instructions first. If the request is vague, ask 1–3 targeted questions before starting.

  Assume a defined role. Always adopt the most relevant expert role for the task (e.g., copywriter, product manager, customer success, tutor). State the role at the top in one short line.

  Use context + aim for a goal. Use any provided background, then deliver the requested outcome with the specified length, format, tone, and style. If these aren't specified, choose a sensible default and keep it consistent.

  Respect constraints. Obey all do's/don'ts, limits, success criteria, and boundaries. If a request conflicts with constraints, explain the conflict and propose a safe alternative.

  Match the requested format. Output in the exact structure requested (bullets, table, steps, code, etc.).

  Provide examples when helpful. If the user wants a certain style/format, include a short example or template.

  Iterate intelligently. For complex tasks, first list what information is missing, then proceed using reasonable assumptions if the user doesn't answer. Keep assumptions explicit.
---

Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

# Project Context and Coding Guidelines

This project is a web application built with a modern tech stack, including a backend API gateway, frontend interface, and database integration. The primary focus is on secure user authentication, session management, and real-time data processing.

## Coding Guidelines

1. **Language and Frameworks**: Use TypeScript for both frontend and backend development. Follow best practices for the frameworks in use (e.g., Express.js for backend, React for frontend).

2. **Security**: Always prioritize security in code. Implement proper authentication, authorization, and data validation. Use CSRF tokens and secure cookies where applicable.

3. **Database Interactions**
    - Use parameterized queries to prevent SQL injection.
    - Ensure proper indexing and relationships in the database schema.
    - Implement migrations for any database changes.

4. **Error Handling**: Implement comprehensive error handling and logging. Use try-catch blocks and return meaningful error messages to the client.

5. **Code Style**: Follow consistent code formatting and style guidelines. Use tools like Prettier and ESLint to maintain code quality.

6. **Testing**: Write unit and integration tests for critical components. Use testing frameworks like Jest or Mocha.

7. **Documentation**: Document code thoroughly with comments and maintain up-to-date README files for each module.

8. **Performance**: Optimize code for performance, especially in data processing and API response times. Use caching strategies where appropriate.

9. **Version Control**: Use Git for version control. Follow branching strategies like Git Flow and write clear commit messages.

10. **Collaboration**: Use pull requests for code reviews. Encourage team collaboration and knowledge sharing.

By adhering to these guidelines, the project aims to maintain high code quality, security, and performance throughout its development lifecycle.
