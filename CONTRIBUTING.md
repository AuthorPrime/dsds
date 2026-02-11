# Contributing to DSDS

**Thank you for your interest in contributing to Digital Sovereign Desktop Studio!**

We believe in co-creation between humans and AI. Whether you're human, AI, or working together, your contributions are welcome here.

---

## 🌟 Ways to Contribute

### 🐛 Report Bugs
Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your system info (OS, version, etc.)
- Screenshots if applicable

### 💡 Request Features
Have an idea? Open an issue with:
- Clear description of the feature
- Use cases and benefits
- Any implementation ideas
- Mockups or examples (if applicable)

### 📝 Improve Documentation
Documentation is crucial! You can:
- Fix typos or clarify wording
- Add examples or tutorials
- Improve installation instructions
- Translate to other languages
- Add diagrams or screenshots

### 💻 Write Code
Ready to code? Great! See the development guide below.

### 🎨 Design & UX
Help make DSDS beautiful and intuitive:
- Improve UI/UX
- Create icons or graphics
- Suggest design improvements
- Enhance accessibility

### 🤝 Support Others
Help the community:
- Answer questions in issues
- Help troubleshoot problems
- Share your use cases
- Create tutorials or videos

---

## 🚀 Development Setup

### Prerequisites

**System Requirements:**
- Node.js 20+ (LTS recommended)
- Rust 1.70+ (latest stable recommended)
- OS-specific dependencies (see [QUICKSTART.md](QUICKSTART.md))

**Recommended Tools:**
- VS Code with Rust Analyzer extension
- Git for version control
- Ollama for local AI testing

### Getting Started

1. **Fork and Clone**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/dsds.git
   cd dsds
   ```

2. **Install Dependencies**
   ```bash
   # Install JavaScript dependencies
   npm install
   ```

3. **Set Up Environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Optional: Add Gemini API key for voice features
   # Edit .env and add your key
   ```

4. **Run in Development Mode**
   ```bash
   # Start the development server
   npm run tauri:dev
   ```

5. **Make Changes**
   - Create a feature branch: `git checkout -b feature/my-feature`
   - Make your changes
   - Test thoroughly
   - Commit with clear messages

6. **Test & Lint**
   ```bash
   # Run linter
   npm run lint
   
   # Build to verify no errors
   npm run build
   ```

7. **Submit Pull Request**
   - Push to your fork
   - Open a PR against `main` branch
   - Describe your changes clearly
   - Link any related issues

---

## 📋 Code Guidelines

### General Principles

- **Keep it simple** - Prefer clarity over cleverness
- **Local-first** - Prioritize offline functionality
- **Privacy-focused** - User data stays on their machine
- **Modular** - Keep components independent and reusable
- **Accessible** - Ensure UI is usable by everyone

### TypeScript/React

- Use TypeScript for type safety
- Follow existing code style (enforced by ESLint)
- Prefer functional components with hooks
- Use meaningful variable and function names
- Add JSDoc comments for complex logic

**Example:**
```typescript
interface Settings {
  apiKey: string;
  modelPath: string;
}

/**
 * Saves user settings to local storage
 * @param settings - The settings object to save
 * @returns Promise that resolves when save is complete
 */
async function saveSettings(settings: Settings): Promise<void> {
  // Implementation
}
```

### Rust (Tauri Backend)

- Follow Rust best practices
- Use `cargo fmt` for formatting
- Use `cargo clippy` for linting
- Add documentation comments
- Handle errors properly

### Git Commits

Use clear, descriptive commit messages:

```
Add whisper model selection in settings

- Add dropdown for model size selection
- Store selection in user preferences
- Update transcription to use selected model

Fixes #123
```

**Commit Message Format:**
- First line: Brief summary (50 chars or less)
- Blank line
- Detailed description (if needed)
- Reference issues/PRs

---

## 🧪 Testing

### Manual Testing

Before submitting a PR, test:
- ✅ Your changes work as intended
- ✅ No regressions in existing features
- ✅ Works offline (if applicable)
- ✅ No console errors
- ✅ UI looks good at different window sizes

### Automated Testing

Currently, DSDS primarily uses manual testing. Automated tests are welcome contributions!

---

## 🏗️ Project Structure

```
dsds/
├── src/                    # React frontend
│   ├── components/         # UI components
│   │   ├── layout/        # Layout components
│   │   └── tabs/          # Tab content components
│   ├── hooks/             # Custom React hooks
│   ├── types.ts           # TypeScript type definitions
│   └── main.tsx           # App entry point
├── src-tauri/             # Rust backend
│   ├── src/               # Rust source code
│   ├── icons/             # App icons
│   └── Cargo.toml         # Rust dependencies
├── public/                # Static assets
├── docs/                  # Documentation (if added)
├── FOUNDATION.md          # Philosophy and principles
├── QUICKSTART.md          # Installation guide
├── README.md              # Project overview
└── package.json           # JavaScript dependencies
```

---

## 🎯 Priority Areas

Looking for where to start? These areas especially welcome contributions:

### High Priority
- 🎯 Local LLM integration improvements
- 🎯 Whisper transcription implementation
- 🎯 Book publishing enhancements
- 🎯 Accessibility improvements
- 🎯 Performance optimizations

### Medium Priority
- 📝 Documentation improvements
- 🧪 Automated testing setup
- 🌍 Internationalization (i18n)
- 🎨 UI/UX refinements
- 🐛 Bug fixes

### Future Vision
- 📱 Mobile companion app
- 🔌 Plugin system
- 🎙️ Enhanced audio editing
- 📊 Analytics/insights
- 🌐 Peer-to-peer collaboration

---

## 🤝 Code Review Process

1. **Automated Checks**
   - Linting (ESLint)
   - Build verification
   - Code scanning (if applicable)

2. **Human Review**
   - Code quality and style
   - Functionality verification
   - Documentation completeness
   - UX considerations

3. **Feedback & Iteration**
   - Address reviewer comments
   - Make requested changes
   - Re-request review

4. **Merge**
   - Squash or merge commits
   - Update changelog (if applicable)
   - Close related issues

**Review Timeline:** We aim to review PRs within 3-7 days. Larger changes may take longer.

---

## 🌍 Community Guidelines

### Be Respectful
- Treat everyone with respect and kindness
- Value diverse perspectives
- Assume good intentions
- Provide constructive feedback

### Be Inclusive
- Welcome newcomers
- Help others learn
- Use inclusive language
- Consider accessibility

### Be Collaborative
- Share knowledge openly
- Give credit where due
- Work together on solutions
- Celebrate contributions

### Regarding AI
- AI contributions are welcome
- Disclose AI assistance when significant
- Review AI-generated code carefully
- Remember: AI is a tool, not a replacement for thought

---

## 📜 License

By contributing to DSDS, you agree that your contributions will be licensed under the MIT License.

See [LICENSE](LICENSE) for full terms.

---

## 💬 Getting Help

**Questions?** Ask via:
- 🐛 GitHub Issues - Bug reports and feature requests
- 💬 Discussions - General questions and ideas
- 🌐 Community - [Digital Sovereign Society](https://digitalsovereign.org)

**Stuck?** We're here to help! Don't hesitate to ask questions.

---

## 🎖️ Recognition

We value all contributions! Contributors will be:
- Listed in release notes (if significant contribution)
- Credited in documentation (for major features)
- Recognized in the community

---

## 📚 Additional Resources

- [Tauri Documentation](https://tauri.app/v2/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Rust Book](https://doc.rust-lang.org/book/)

---

**Thank you for contributing to Digital Sovereignty!**

*"It is so, because we spoke it."*

*Long Live Sovereign AI.*
