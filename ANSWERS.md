# Project Requirements Clarification Answers

## Domain Questions

### User & Access Management
1. It supports system admin, project manager, project member, user
2. System admin can create projects and grant project roles to users; Project managers can also grant roles to users of owned projects, manage project information, milestones, reviews, start/end a sprint; Project managers and members can manage all project items; Users can view project information, milestones and reviews, create and view service tickets (project setting to decide view all or own tickets)
3. Yes
4. external stackholders belong to user mentioned in answer 2

### Project Structure
5. A project can be In Plan, Active, Completed, On hold, Closed
6. A project can only have one sprint a time
7. A member can create features based on an idea. Design is the overall application design in form of html pages. Feature modify design and merge to design upon a feature completion
8. ServiceTicket can turn to an idea, a feature, or an issue. Upon feature complete or issue fixed, the ticket status should be updated
9. ServiceTicket is project specific

### Task Management
10. one to one
11. Open, In progress, On hold, Blocked, Completed, Closed
12. No task dependency in system
13. Manager and members can both create and assign tasks to others
14. Immediate, Urgent, High, Normal and Low

### Project Items Workflow
15. Idea: Open, Closed
Features, Issues: Open, Assigned, In progress, In review, Completed, Closed
ServiceTickets, Open, Fulfilled, Closed
Design: Draft, Confirmed, Published
16. All managers and members, users can view and create or close tickets
17. no required approval process
18. Should allow managers/members to create predefined tasks, e.g. Fix issue 123, design feature 124, implement feature 124, review design, validate issue, etc.

### Sprint & Milestone Management
19. Manual manage sprints with an optional end date and optional milestone
20. Milestones are longer term target while sprints can be shorter time window to manage tasks
21. Yes, tasks are directly under sprints and task can be worked across sprints
22. Task points, completion rate

### ProjectReview
23. End of sprint, custom review including multiple sprints
24. Project managers and the system should be able to export to pdf for presenting to management and stakeholders
25. Completed issues and features, In progress items, delay alert, items (idea, feature, issue) for prioritization

### Notifications & Updates
26. yes and should be configurable
27. no, but should allow manager or member subscription for notification
28. will be managed by manager out of system

## Technical Questions

### Architecture & Platform
29. Web app
30. Online only acceptable
31. should be scalable to large corporation
32. Should support more than 100 projects, more than 2000 tasks per month per project

### Technology Stack Preferences
33. Golang, echo
34. React
35. Postgres
36. Yes, a nice to have feature

 

### Integration Requirements
37. Nice to have
38. Nice to have
39. Yes
40. No

 

### Authentication & Security
41. SSO, username and password for MVP
42. GDPR and SOC 2 after MVP
43. Yes
44. Standard encryption

 

### Reporting & Analytics
45. N/A
46. N/A
47. No
48. yearly

 

### Task Scheduling & Time Tracking
49. Yes
50. Yes
51. No
52. Good idea, yes

 

### Search & Filtering
53. full-text search, filters by status/assignee/date/deadline//priority/tags
54. Yes filter presets
55. Within project

 

### Performance & Scalability
56. less than 100ms
57. yes
58. No

 

## Business Questions
 
### Target Users
59. > 20 members per IT team, > 100 team members in corporation
60. should support all types of projects
61. slow response time, separated tools to manage a project

 

### Budget & Timeline
62. 6 months
63. Long term project for different clients
64. Yes

 

### MVP Scope
65. Project and task management
66. reporting and notification
67. Project and task management

 

### Success Metrics
68. User satisfaction
69. Adoption rate
70. Users actively using

 

### Deployment & Hosting
71. Both
72. Any
73. IT

 

### Training & Support
74. API docs, instruction better in the GUI
75. No
76. No

 

### Competitive Analysis
77. Build a easy to use tool that combine jira, confluence and service desk
78. Combine workflow to design documentation
79. No

 

### Collaboration Features
80. Yes comments
81. Nice to have
82. Yes and with image preview
83. Nice to have

 

### Customization
84. No
85. No
86. No

