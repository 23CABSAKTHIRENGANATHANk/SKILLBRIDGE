export interface ResumeScoreResult {
  overallScore: number;
  sections: {
    header: { score: number; feedback: string[] };
    contact: { score: number; feedback: string[] };
    summary: { score: number; feedback: string[] };
    experience: { score: number; feedback: string[] };
    education: { score: number; feedback: string[] };
    skills: { score: number; feedback: string[] };
    projects: { score: number; feedback: string[] };
    certifications: { score: number; feedback: string[] };
  };
  strengths: string[];
  improvements: string[];
}

export class ResumeScorer {
  private static readonly SECTION_WEIGHTS = {
    header: 0.05,
    contact: 0.1,
    summary: 0.1,
    experience: 0.25,
    education: 0.15,
    skills: 0.2,
    projects: 0.1,
    certifications: 0.05,
  };

  static scoreResume(resumeContent: string): ResumeScoreResult {
    const sections = this.parseSections(resumeContent);
    const sectionScores = this.scoreSections(sections, resumeContent);
    const overallScore = this.calculateOverallScore(sectionScores);

    return {
      overallScore: Math.round(overallScore),
      sections: sectionScores,
      strengths: this.identifyStrengths(sectionScores, resumeContent),
      improvements: this.identifyImprovements(sectionScores, resumeContent),
    };
  }

  private static parseSections(content: string) {
    return {
      header: this.extractHeader(content),
      contact: this.extractContact(content),
      summary: this.extractSummary(content),
      experience: this.extractExperience(content),
      education: this.extractEducation(content),
      skills: this.extractSkills(content),
      projects: this.extractProjects(content),
      certifications: this.extractCertifications(content),
    };
  }

  private static extractHeader(content: string): string {
    const lines = content.split("\n");
    return lines[0] || "";
  }

  private static extractContact(content: string): string {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /\+?[\d\s\-()]{10,}/g;
    const linkedinRegex = /linkedin\.com\/in\/[\w-]+/gi;

    const emails = content.match(emailRegex) || [];
    const phones = content.match(phoneRegex) || [];
    const linkedin = content.match(linkedinRegex) || [];

    return JSON.stringify({ emails, phones, linkedin });
  }

  private static extractSummary(content: string): string {
    const summaryMatch = content.match(
      /(?:summary|overview|about|profile)[:\s]+([\s\S]{10,300}?)(?=\n\n|\nexperience|\nskills|$)/i
    );
    return summaryMatch ? summaryMatch[1] : "";
  }

  private static extractExperience(content: string): string {
    const expMatch = content.match(
      /(?:experience|work history)[:\s]+([\s\S]*?)(?=\neducation|\nskills|\ncertifications|$)/i
    );
    return expMatch ? expMatch[1] : "";
  }

  private static extractEducation(content: string): string {
    const eduMatch = content.match(
      /(?:education)[:\s]+([\s\S]*?)(?=\nskills|\nexperience|\ncertifications|$)/i
    );
    return eduMatch ? eduMatch[1] : "";
  }

  private static extractSkills(content: string): string {
    const skillMatch = content.match(
      /(?:skills)[:\s]+([\s\S]*?)(?=\nexperience|\neducation|\ncertifications|$)/i
    );
    return skillMatch ? skillMatch[1] : "";
  }

  private static extractProjects(content: string): string {
    const projMatch = content.match(
      /(?:projects|portfolio)[:\s]+([\s\S]*?)(?=\neducation|\nskills|\ncertifications|$)/i
    );
    return projMatch ? projMatch[1] : "";
  }

  private static extractCertifications(content: string): string {
    const certMatch = content.match(
      /(?:certifications|licenses)[:\s]+([\s\S]*?)(?=\n$)/i
    );
    return certMatch ? certMatch[1] : "";
  }

  private static scoreSections(
    sections: Record<string, string>,
    content: string
  ): Record<string, { score: number; feedback: string[] }> {
    return {
      header: this.scoreHeader(sections.header),
      contact: this.scoreContact(sections.contact),
      summary: this.scoreSummary(sections.summary),
      experience: this.scoreExperience(sections.experience),
      education: this.scoreEducation(sections.education),
      skills: this.scoreSkills(sections.skills),
      projects: this.scoreProjects(sections.projects),
      certifications: this.scoreCertifications(sections.certifications),
    };
  }

  private static scoreHeader(content: string): { score: number; feedback: string[] } {
    let score = 50;
    const feedback: string[] = [];

    if (content && content.length >= 5) {
      score += 25;
      feedback.push("Name/header present");
    } else {
      feedback.push("Name should be clear at the top");
    }

    if (content && content.toUpperCase() === content.substring(0, 3)) {
      score += 25;
      feedback.push("Professional formatting detected");
    } else {
      feedback.push("Consider capitalizing name properly");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static scoreContact(content: string): { score: number; feedback: string[] } {
    let score = 30;
    const feedback: string[] = [];
    const contactData = JSON.parse(content);

    if (contactData.emails?.length > 0) {
      score += 25;
      feedback.push("Email address found");
    } else {
      feedback.push("Add professional email");
    }

    if (contactData.phones?.length > 0) {
      score += 20;
      feedback.push("Phone number included");
    }

    if (contactData.linkedin?.length > 0) {
      score += 25;
      feedback.push("LinkedIn profile linked");
    } else {
      feedback.push("Add LinkedIn profile URL");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static scoreSummary(content: string): { score: number; feedback: string[] } {
    let score = 40;
    const feedback: string[] = [];

    if (!content || content.length === 0) {
      feedback.push("Add a professional summary (2-3 lines)");
      return { score, feedback };
    }

    if (content.length >= 50 && content.length <= 300) {
      score += 40;
      feedback.push("Good summary length");
    } else if (content.length > 300) {
      score += 20;
      feedback.push("Summary is too long, aim for 2-3 lines");
    } else {
      score += 10;
      feedback.push("Summary is too short");
    }

    const keywordCount = (content.match(/\b(experienced|skilled|passionate|proficient|expert)\b/gi) || []).length;
    if (keywordCount > 0) {
      score += 20;
      feedback.push("Strong action words used");
    } else {
      feedback.push("Use action-oriented language");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static scoreExperience(content: string): { score: number; feedback: string[] } {
    let score = 40;
    const feedback: string[] = [];

    if (!content || content.length === 0) {
      feedback.push("Add your work experience");
      return { score, feedback };
    }

    const jobCount = (content.match(/\b(?:managed|led|developed|designed|created|improved)\b/gi) || []).length;
    if (jobCount >= 3) {
      score += 40;
      feedback.push("Multiple achievements listed");
    } else if (jobCount > 0) {
      score += 25;
      feedback.push("Add more specific achievements and results");
    } else {
      feedback.push("Use action verbs like 'developed', 'managed', 'led'");
    }

    const dateCount = (content.match(/\b\d{4}\b/g) || []).length;
    if (dateCount >= 2) {
      score += 20;
      feedback.push("Dates included");
    } else {
      feedback.push("Include dates for each position");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static scoreEducation(content: string): { score: number; feedback: string[] } {
    let score = 40;
    const feedback: string[] = [];

    if (!content || content.length === 0) {
      feedback.push("Add your educational background");
      return { score, feedback };
    }

    const degreeMatch = content.match(/\b(bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\.|btech|mtech)\b/gi);
    if (degreeMatch) {
      score += 30;
      feedback.push("Degree type mentioned");
    } else {
      feedback.push("Specify degree type (BS, MS, etc.)");
    }

    const schoolMatch = content.match(/[A-Z][a-z\s]+(?:university|institute|college)/gi);
    if (schoolMatch) {
      score += 30;
      feedback.push("University/Institution named");
    } else {
      feedback.push("Include institution name");
    }

    const yearMatch = content.match(/\b\d{4}\b/);
    if (yearMatch) {
      score += 10;
      feedback.push("Graduation year included");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static scoreSkills(content: string): { score: number; feedback: string[] } {
    let score = 40;
    const feedback: string[] = [];

    if (!content || content.length === 0) {
      feedback.push("Add a skills section with 8-12 relevant skills");
      return { score, feedback };
    }

    const skillCount = content.split(/[,•\n]/).filter((s) => s.trim().length > 0).length;
    if (skillCount >= 8 && skillCount <= 15) {
      score += 40;
      feedback.push(`Good skill count (${skillCount})`);
    } else if (skillCount > 15) {
      score += 20;
      feedback.push("Consider limiting to top 12 skills");
    } else {
      score += 15;
      feedback.push(`Add more skills (have ${skillCount}, aim for 8-12)`);
    }

    const techSkills =
      (content.match(/\b(python|javascript|java|react|node|aws|docker|sql|git|linux)\b/gi) || []).length >
      0;
    if (techSkills) {
      score += 20;
      feedback.push("Technical skills included");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static scoreProjects(content: string): { score: number; feedback: string[] } {
    let score = 50;
    const feedback: string[] = [];

    if (!content || content.length === 0) {
      feedback.push("Add 1-2 significant projects with results");
      return { score, feedback };
    }

    const projectCount = (content.match(/(?:project|built|created|developed)/gi) || []).length;
    if (projectCount >= 2) {
      score += 30;
      feedback.push("Multiple projects listed");
    } else {
      score += 15;
      feedback.push("Include link to github/portfolio");
    }

    const linkMatch = content.match(/https?:\/\/[^\s]+/gi);
    if (linkMatch) {
      score += 20;
      feedback.push("Project links included");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static scoreCertifications(content: string): { score: number; feedback: string[] } {
    let score = 60;
    const feedback: string[] = [];

    if (!content || content.length === 0) {
      feedback.push("Add relevant certifications if you have any");
      return { score, feedback };
    }

    const certCount = content.split(/[,•\n]/).filter((s) => s.trim().length > 0).length;
    if (certCount >= 2) {
      score += 30;
      feedback.push(`${certCount} certifications listed`);
    } else {
      score += 10;
      feedback.push("Consider adding more certifications");
    }

    return { score: Math.min(score, 100), feedback };
  }

  private static calculateOverallScore(
    sectionScores: Record<string, { score: number; feedback: string[] }>
  ): number {
    let totalScore = 0;

    for (const [section, { score }] of Object.entries(sectionScores)) {
      const weight = ResumeScorer.SECTION_WEIGHTS[section as keyof typeof ResumeScorer.SECTION_WEIGHTS];
      totalScore += (score * weight) / 100;
    }

    return totalScore * 100;
  }

  private static identifyStrengths(
    sectionScores: Record<string, { score: number; feedback: string[] }>,
    content: string
  ): string[] {
    const strengths: string[] = [];

    for (const [section, { score }] of Object.entries(sectionScores)) {
      if (score >= 80) {
        strengths.push(`Strong ${section} section`);
      }
    }

    if (content.match(/\b(experience|years)\b/gi)) {
      strengths.push("Clear career progression demonstrated");
    }

    if (content.match(/\b(managed|led|supervised)\b/gi)) {
      strengths.push("Leadership experience highlighted");
    }

    if (content.match(/\b(github|portfolio|website)\b/gi)) {
      strengths.push("Online presence linked");
    }

    return strengths.slice(0, 3);
  }

  private static identifyImprovements(
    sectionScores: Record<string, { score: number; feedback: string[] }>,
    content: string
  ): string[] {
    const improvements: string[] = [];

    for (const [section, { score, feedback }] of Object.entries(sectionScores)) {
      if (score < 70 && feedback.length > 0) {
        improvements.push(feedback[0]);
      }
    }

    if (!content.match(/\b(improved|increased|reduced|optimized)\b/gi)) {
      improvements.push("Add quantifiable results in experience");
    }

    if (!content.match(/\bhttps?:\/\//gi)) {
      improvements.push("Add links to portfolio or GitHub");
    }

    return improvements.slice(0, 3);
  }

  static calculateSkillGap(candidateSkills: string[], jobRequiredSkills: string[]): {
    matchedSkills: string[];
    missingSkills: string[];
    fitPercentage: number;
  } {
    const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());
    const jobSkillsLower = jobRequiredSkills.map((s) => s.toLowerCase());

    const matchedSkills = jobSkillsLower.filter((skill) =>
      candidateSkillsLower.some((cSkill) =>
        cSkill.includes(skill) || skill.includes(cSkill)
      )
    );

    const missingSkills = jobSkillsLower.filter((skill) => !matchedSkills.includes(skill));

    const fitPercentage = Math.round((matchedSkills.length / jobSkillsLower.length) * 100);

    return { matchedSkills, missingSkills, fitPercentage };
  }
}

export { ResumeScorer };
