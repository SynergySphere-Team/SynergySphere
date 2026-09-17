Deliverable 3: Modelling

2. Functional and Non-functional Requirements

2.1 Functional Requirements

Functional requirements specify the core services, operations, and capabilities that SynergySphere must deliver to satisfy user objectives and system purposes.

User Management

The platform must allow prospective users to establish accounts through verified email addresses or institutional student identification numbers. Once registered, users must authenticate themselves through secure login credentials protected by encrypted transmission. A password recovery facility must exist for individuals who cannot recall their existing credentials. Every user must retain the capacity to inspect, modify, and refresh personal profile data, encompassing contact particulars and academic discipline preferences.

SkillUp Module

The system must deliver artificial intelligence-driven programming support that interprets natural-language queries and produces contextually relevant code explanations. It must autonomously generate coding exercises calibrated to an individual learner's demonstrated competency level, then assess submitted solutions against predetermined correctness benchmarks. The module must replicate technical recruitment interviews through artificially intelligent questioning adapted to particular programming languages or software frameworks. Moreover, the system must scrutinise personal performance trajectories to suggest complementary learning resources and pinpointed practice exercises.

LectureToLife Module

The platform must accept uploaded lecture materials and condense them into succinct summaries emphasising pivotal concepts. It must autonomously produce digital flashcards extracted from course content to support spaced-repetition study techniques. The module must formulate self-evaluation quizzes from uploaded notes, permitting students to gauge their own understanding. Additionally, it must recommend practical software development ventures that correspond with theoretical subject matter addressed in academic coursework.

Productivity Module

Users must have the facility to assemble study timetables arranged by day, week, or month. The system must permit task creation, priority ranking, and assignment tracking linked to specific deadlines. Automated notification systems must warn users of approaching deadlines or overdue obligations. Visual dashboards must display study advancement metrics, completion percentages, and productivity trajectories.

Wellness Module

The platform must distribute periodic wellness questionnaires to measure student psychological health status. It must track behavioural signals connected to strain and exhaustion, such as inconsistent study routines or diminishing participation. Drawing upon aggregated responses, the system must dispense individualised wellness guidance. Users must additionally obtain access to selected mindfulness practices, stress regulation strategies, and mental health reference materials.

Community Module

Users must have the capacity to examine available community software ventures with comprehensive descriptions and specified requirements. They must apply to participate in sustainability-focused initiatives, including ecological tourism and environmentally responsible infrastructure projects. The module must facilitate cooperative workflows, allowing team members to correspond, exchange files, and harmonise development efforts. Participants must submit finished project deliverables through the platform. Supervisors must possess supervisory functions to review advancement, offer direction, and endorse submissions.

Administration Module

Administrators must wield control over user accounts, encompassing suspension, role allocation, and access withdrawal. They must curate the repository of learning materials, inserting or removing resources as academic syllabi develop. The system must produce analytical reports on platform utilisation, module participation, and student achievement. Administrators must regulate community project listings to guarantee quality and suitability. They must additionally manage platform-wide announcements and notification distributions.

2.2 Non-Functional Requirements

Non-functional requirements govern the operational characteristics, quality attributes, and constraints under which the system must perform.

Performance

Under ordinary operating circumstances, system response latency must remain beneath three seconds for every user interaction. The architecture must support a minimum of five hundred concurrent active users without deterioration in service calibre.

Security

Every user password must undergo encryption through industry-standard hashing algorithms prior to persistence. Data transmission between clients and servers must be safeguarded through Hypertext Transfer Protocol Secure (HTTPS). The platform must impose role-based access control, constraining sensitive functions to authorised personnel exclusively. Processing and storage of personal information must conform completely to the Protection of Personal Information Act (POPIA).

Reliability

The system must sustain operational availability of at least ninety-nine point five percent, excluding planned maintenance intervals. Automated database backups must occur on a daily cycle. In the circumstance of unforeseen system failure, data recovery protocols must reinstate operations to the most recent stable condition.

Usability

The user interface must conform to principles of simplicity and intuitive navigation, reducing cognitive burden for novice users. The platform must display appropriately across desktop computers, tablet devices, and mobile telephones. Core navigation pathways must demand minimal prior instruction. Accessibility standards must be integrated to accommodate users with varied requirements.

Scalability

The underlying infrastructure must accommodate expansion in registered users and transaction volumes without requiring architectural reconstruction. Future module additions or feature enlargements must incorporate into the existing framework without disturbing current functionality.

Maintainability

The application must be built according to modular design principles, segregating components to enable independent updates. Source code must be exhaustively documented to sustain future development endeavours. System updates and patches must deploy without interrupting existing services or corrupting stored data.

Compatibility

The platform must operate correctly on contemporary web browsers, specifically Google Chrome, Microsoft Edge, Mozilla Firefox, and Apple Safari. It must remain accessible from devices running Windows, Linux, macOS, and Android operating systems.

3. User Stories or Use Case Narratives

User stories, along with their associated story cards and task lists, are associated with the agile development approaches. User stories have been shown to be very useful in gathering requirements in a nonthreatening manner that respects the user's point of view. They are typically captured using story cards (index cards) and are recorded on a task list (or from a Scrum perspective, on the product backlog). Both story cards and task lists are considered to be lightweight approaches to documenting and gathering requirements.

Stories capture both functional and non-functional requirements.

3.1 Functional Requirement–Based User Stories

User Story 1: Account Creation
As a prospective student, I want to be able to register a SynergySphere account using my institutional email so that I can access intelligent coding assistance, productivity instruments, and community project opportunities.

User Story 2: Secure Authentication
As a registered user, I want to be able to log into the platform with my credentials and recover my password if forgotten so that my account remains accessible and protected.

User Story 3: Profile Maintenance
As a student, I want to be able to update my personal profile information, including contact details and academic preferences, so that my account accurately reflects my current circumstances.

User Story 4: AI Programming Support
As a student, I want to be able to submit programming questions and receive artificially intelligent explanations with code illustrations so that I can deepen my understanding and resolve coding difficulties through independent reasoning.

User Story 5: Adaptive Coding Exercises
As a student, I want to be able to attempt coding exercises that match my current proficiency level and receive automated evaluation so that I can practise effectively and track my improvement over time.

User Story 6: Interview Simulation
As a student approaching graduation, I want to be able to complete simulated technical interviews powered by artificial intelligence so that I can build confidence and refine my responses before attending actual software development interviews.

User Story 7: Lecture Material Summarisation
As a student, I want to be able to upload my lecture notes so that the platform can automatically produce concise summaries and digital flashcards, thereby enhancing the efficiency of my examination preparation.

User Story 8: Self-Assessment Quizzes
As a student, I want to be able to generate self-evaluation quizzes from my uploaded course notes so that I can gauge my own comprehension and identify knowledge gaps before examinations.

User Story 9: Study Timetable Construction
As a student managing multiple modules and deadlines, I want to be able to create structured study timetables organised by day, week, or month so that I can allocate my time systematically across academic responsibilities.

User Story 10: Task and Deadline Tracking
As a student, I want to be able to create, prioritise, and track academic tasks with associated deadlines so that I can improve my time management and consistently meet submission dates.

User Story 11: Progress Visualisation
As a student, I want to be able to view visual dashboards displaying my study progress metrics, completion rates, and productivity trends so that I can monitor my academic performance at a glance.

User Story 12: Wellness Check-In
As a student experiencing academic pressure, I want to be able to complete regular wellness check-ins through periodic questionnaires so that I can identify early symptoms of stress or burnout and receive actionable guidance for improving my mental health.

User Story 13: Mindfulness Resource Access
As a student, I want to be able to access curated mindfulness exercises, stress management techniques, and mental health resources so that I can proactively maintain my psychological well-being during demanding study periods.

User Story 14: Community Project Browsing
As a student seeking to strengthen my portfolio, I want to be able to browse available community software projects with detailed descriptions and requirements so that I can identify opportunities aligned with my interests and skill development goals.

User Story 15: Project Participation
As a student, I want to be able to apply to join sustainability-oriented initiatives, including eco-tourism and green infrastructure projects, so that I can develop practical competencies while making meaningful contributions to community development.

User Story 16: Team Collaboration
As a project participant, I want to be able to communicate with team members, share files, and coordinate development activities within the platform so that our collaborative workflow remains centralised and efficient.

User Story 17: Administrative Oversight
As a platform administrator, I want to be able to manage user accounts, curate learning resources, and supervise community projects so that the platform remains secure, well-organised, and pedagogically effective for all users.

User Story 18: Analytics and Reporting
As an administrator, I want to be able to generate analytical reports on platform usage, module engagement, and student performance so that I can make informed decisions about platform improvements and resource allocation.

3.2 Non-Functional Requirement–Based User Stories

User Story 19: Rapid Response Times
As a student, I want to be able to interact with the platform without experiencing delays exceeding three seconds so that my study workflow remains uninterrupted and I can maintain focus on my academic tasks.

User Story 20: Concurrent User Support
As a student, I want to be able to access the platform reliably even when five hundred other users are active simultaneously so that I can depend on the service during peak usage periods such as examination seasons.

User Story 21: Password Protection
As a user, I want to be able to trust that my password is encrypted through industry-standard hashing algorithms before storage so that my account remains secure even in the event of a data breach.

User Story 22: Secure Data Transmission
As a user, I want to be able to exchange data with the platform over HTTPS so that my personal information and academic work are protected from interception during transmission.

User Story 23: POPIA Compliance
As a South African student, I want to be able to use a platform that fully adheres to the Protection of Personal Information Act so that my personal data is processed and stored in accordance with national privacy legislation.

User Story 24: Platform Availability
As a student preparing for examinations, I want to be able to access the platform with at least ninety-nine point five percent availability, excluding planned maintenance, so that I can depend on it for consistent study support throughout the semester.

User Story 25: Data Recovery Assurance
As a user, I want to be able to trust that automated daily database backups and recovery procedures exist so that my progress, tasks, and portfolio items are not permanently lost in the event of unexpected system failure.

User Story 26: Intuitive Interface Design
As a first-time user, I want to be able to navigate the platform with minimal prior training so that I can begin using its features immediately without struggling to locate core functions.

User Story 27: Cross-Device Accessibility
As a student, I want to be able to access the platform from my desktop computer, tablet, or mobile telephone so that I can manage my academic responsibilities regardless of which device I have available.

User Story 28: Browser Compatibility
As a student, I want to be able to use the platform correctly on Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari so that I am not forced to install unfamiliar software to access my learning resources.

User Story 29: Modular Expansion
As a platform stakeholder, I want to be able to introduce future modules or feature expansions into the existing framework without disrupting current functionality so that the platform can evolve alongside changing academic and technological needs.

User Story 30: Seamless Updates
As a user, I want to be able to continue using the platform without interruption during system updates and patches so that my study schedule is not disrupted by maintenance activities.
