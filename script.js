// Modern JavaScript for Pinnacle Realty Partners Website
// Author: Claude Sonnet 4
// Enhanced UX with smooth animations and comprehensive form handling

class PinnacleWebsite {
    constructor() {
        this.form = document.getElementById('main-form');
        this.submitBtn = document.querySelector('.form-submit-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.backBtn = document.getElementById('back-btn');
        this.loadingSpinner = document.querySelector('.btn-loading');
        this.mobileToggle = document.querySelector('.mobile-menu-toggle');
        this.navbar = document.querySelector('.navbar');
        this.currentStep = 1;
        
        // Spam Protection
        this.formLoadTime = Date.now();
        this.minSubmissionTime = 3000; // 3 seconds minimum
        this.lastSubmissionTime = parseInt(localStorage.getItem('lastSubmissionTime') || '0');
        this.submissionCooldown = 300000; // 5 minutes between submissions
        
        // Configuration for Airtable
        this.airtableConfig = {
            baseId: 'appGD58Yy4rFpOBTH', // Your Real Estate CRM Base ID
            tableName: 'Sellers', // Try simplified name first
            apiKey: 'YOUR_AIRTABLE_API_KEY_HERE' // Your API key
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFAQ();
        this.setupScrollEffects();
        this.setupAnimations();
        this.setupMobileMenu();
        this.setupFormValidation();
    }

    // Event Listeners Setup
    setupEventListeners() {
        // Form submission
        if (this.form) {
            this.form.addEventListener('submit', this.handleFormSubmit.bind(this));
        }

        // Next button (Step 1 to Step 2)
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', this.handleNextStep.bind(this));
        }

        // Back button (Step 2 to Step 1)
        if (this.backBtn) {
            this.backBtn.addEventListener('click', this.handleBackStep.bind(this));
        }

        // Smooth scroll for navigation links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', this.handleSmoothScroll.bind(this));
        });

        // CTA buttons
        document.querySelectorAll('[onclick*="scrollToForm"]').forEach(btn => {
            btn.addEventListener('click', this.scrollToForm.bind(this));
        });

        // Window scroll for navbar effects
        window.addEventListener('scroll', this.handleScroll.bind(this));

        // Form input validation
        document.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('blur', this.validateField.bind(this));
            input.addEventListener('input', this.clearFieldError.bind(this));
        });
    }

    // Form Submission Handler (Step 2 only)
    async handleFormSubmit(event) {
        event.preventDefault();
        
        // Only allow submission from step 2
        if (this.currentStep !== 2) {
            return;
        }
        
        // Spam Protection Checks
        if (!this.validateSpamProtection()) {
            return;
        }
        
        if (!this.validateStep2()) {
            return;
        }

        this.showLoading();
        
        try {
            const formData = this.getFormData();
            
            // Record successful submission time
            localStorage.setItem('lastSubmissionTime', Date.now().toString());
            
            await this.submitToAirtable(formData);
            // Redirect to thank you page instead of showing modal
            window.location.href = 'thank-you.html';
        } catch (error) {
            console.error('Form submission error:', error);
            this.showError('There was an error submitting your information. Please try again.');
            this.hideLoading();
        }
    }

    // Handle Next Step (Step 1 to Step 2)
    handleNextStep() {
        if (this.validateStep1()) {
            this.goToStep(2);
        }
    }

    // Handle Back Step (Step 2 to Step 1) 
    handleBackStep() {
        this.goToStep(1);
    }

    // Navigate between steps
    goToStep(stepNumber) {
        // Hide current step
        const currentStepEl = document.getElementById(`step-${this.currentStep}`);
        currentStepEl.classList.remove('active');
        
        // Show new step
        const newStepEl = document.getElementById(`step-${stepNumber}`);
        newStepEl.classList.add('active');
        
        // Update current step
        this.currentStep = stepNumber;
    }



    // Get form data mapped to Airtable field IDs
    getFormData() {
        const formData = new FormData(this.form);
        return {
            'fldtEUxH8s2VqpUAf': formData.get('fullName'),  // Seller Name
            'fldwq6E6dlRVIxcBl': formData.get('phone'),     // Phone Number  
            'fldZPvhhjUi0qR6JJ': formData.get('email'),     // Email
            'fldQFyAYKsO60VRql': formData.get('address'),   // Property Address
            'fld3VABv1uoM1735y': formData.get('city'),       // Property City
            'flduqfSf5cnwBt9MD': formData.get('state'),     // Property State
            'fld9OFoTcfzX1GVk3': formData.get('zipCode'),   // Property Zip
            'fldwdN1unMgU07LIF': parseInt(formData.get('yearBuilt')) || null, // Year Built (number)
            'fldbWxjq58xMXk5La': formData.get('condition'),  // Condition
            'fldaUV9Dx81KEI7RN': formData.get('bedrooms'),   // Bedrooms
            'fldc9TNdjnOrOK5f8': formData.get('bathrooms'),  // Bathrooms
            'fldHAzYkOzSoR8zES': formData.get('notes') || '' // Notes
        };
    }

    // Submit to Airtable
    async submitToAirtable(data) {
        const url = `https://api.airtable.com/v0/${this.airtableConfig.baseId}/${encodeURIComponent(this.airtableConfig.tableName)}`;
        
        const payload = {
            fields: data  // data already contains the field IDs as keys
        };
        
        console.log('=== AIRTABLE SUBMISSION DEBUG ===');
        console.log('URL:', url);
        console.log('Base ID:', this.airtableConfig.baseId);
        console.log('Table Name:', this.airtableConfig.tableName);
        console.log('API Key (first 10 chars):', this.airtableConfig.apiKey.substring(0, 10) + '...');
        console.log('Payload:', payload);
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.airtableConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            console.log('Response status:', response.status);
            console.log('Response statusText:', response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Airtable API error response:', errorText);
                throw new Error(`Airtable submission failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log('Airtable success:', result);
            return result;
        } catch (error) {
            console.error('=== SUBMISSION ERROR ===');
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Full error:', error);
            throw error;
        }
    }

    // Step 1 Validation
    validateStep1() {
        const requiredFields = ['fullName', 'phone', 'email'];
        let isValid = true;

        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!this.validateField({ target: field })) {
                isValid = false;
            }
        });

        return isValid;
    }

    // Step 2 Validation
    validateStep2() {
        const requiredFields = ['address', 'city', 'state', 'zipCode', 'yearBuilt', 'condition', 'bedrooms', 'bathrooms'];
        let isValid = true;

        requiredFields.forEach(fieldName => {
            const field = document.getElementById(fieldName);
            if (!this.validateField({ target: field })) {
                isValid = false;
            }
        });

        return isValid;
    }

    // Spam Protection Validation
    validateSpamProtection() {
        const currentTime = Date.now();
        
        // Check honeypot field (should be empty)
        const honeypot = document.getElementById('website');
        if (honeypot && honeypot.value.trim() !== '') {
            console.warn('Honeypot field filled - potential bot detected');
            this.showError('Please complete the form properly.');
            return false;
        }
        
        // Check minimum time since page load (human behavior)
        const timeSinceLoad = currentTime - this.formLoadTime;
        if (timeSinceLoad < this.minSubmissionTime) {
            this.showError('Please take a moment to review your information before submitting.');
            return false;
        }
        
        // Check rate limiting (prevent rapid successive submissions)
        const timeSinceLastSubmission = currentTime - this.lastSubmissionTime;
        if (timeSinceLastSubmission < this.submissionCooldown) {
            const minutesLeft = Math.ceil((this.submissionCooldown - timeSinceLastSubmission) / 60000);
            this.showError(`Please wait ${minutesLeft} minutes before submitting another request.`);
            return false;
        }
        
        // Validate form data patterns (additional spam detection)
        if (!this.validateFormPatterns()) {
            this.showError('Please ensure all information is filled out correctly.');
            return false;
        }
        
        return true;
    }

    // Additional pattern validation for spam detection
    validateFormPatterns() {
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const address = document.getElementById('address').value.trim();
        
        // Check for obvious spam patterns
        const spamPatterns = [
            /(.)\1{4,}/i, // Repeated characters (aaaaa, 11111)
            /test.*test/i, // Multiple "test" words
            /spam|fuck|shit|damn/i, // Common spam words
            /^.{1,2}$/i // Too short names/addresses
        ];
        
        // Check name for spam patterns
        if (spamPatterns.some(pattern => pattern.test(fullName))) {
            return false;
        }
        
        // Check address for obvious fake patterns
        if (address.length < 5 || spamPatterns.some(pattern => pattern.test(address))) {
            return false;
        }
        
        // Ensure email and name don't match exactly (common bot behavior)
        if (fullName.toLowerCase() === email.split('@')[0].toLowerCase()) {
            return false;
        }
        
        return true;
    }

    validateField(event) {
        const field = event.target;
        const value = field.value.trim();
        const fieldName = field.name;
        
        // Remove existing error
        this.clearFieldError(event);
        
        let isValid = true;
        let errorMessage = '';

        // Required field validation
        if (field.required && !value) {
            errorMessage = 'This field is required';
            isValid = false;
        }
        // Email validation
        else if (fieldName === 'email' && value) {
            const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
            if (!emailRegex.test(value)) {
                errorMessage = 'Please enter a valid email address (e.g., john@example.com)';
                isValid = false;
            }
        }
        // Phone validation
        else if (fieldName === 'phone' && value) {
            // Remove all non-digits to check length
            const digitsOnly = value.replace(/\D/g, '');
            const phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
            if (!phoneRegex.test(value) || digitsOnly.length !== 10) {
                errorMessage = 'Please enter a valid 10-digit phone number (e.g., 555-123-4567)';
                isValid = false;
            }
        }
        // Name validation
        else if (fieldName === 'fullName' && value) {
            if (value.length < 2) {
                errorMessage = 'Please enter your full name';
                isValid = false;
            }
        }
        // Year Built validation
        else if (fieldName === 'yearBuilt' && value) {
            const year = parseInt(value);
            const currentYear = new Date().getFullYear();
            if (year < 1800 || year > currentYear) {
                errorMessage = `Please enter a year between 1800 and ${currentYear}`;
                isValid = false;
            }
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    showFieldError(field, message) {
        field.style.borderColor = '#EF4444';
        field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        
        // Remove existing error message
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = '#EF4444';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(event) {
        const field = event.target;
        field.style.borderColor = '';
        field.style.boxShadow = '';
        
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    // Loading States
    showLoading() {
        if (this.submitBtn && this.loadingSpinner) {
            this.submitBtn.disabled = true;
            this.submitBtn.style.opacity = '0.7';
            this.loadingSpinner.style.opacity = '1';
        }
    }

    hideLoading() {
        if (this.submitBtn && this.loadingSpinner) {
            this.submitBtn.disabled = false;
            this.submitBtn.style.opacity = '1';
            this.loadingSpinner.style.opacity = '0';
        }
    }

    // Success and Error Messages
    showSuccess() {
        // Create success overlay
        const overlay = document.createElement('div');
        overlay.className = 'success-overlay';
        overlay.innerHTML = `
            <div class="success-modal">
                <div class="success-icon">✓</div>
                <h3>Thank You!</h3>
                <p>Your information has been submitted successfully. We'll contact you within 24 hours with your cash offer!</p>
                <button class="success-close" onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        
        // Add styles
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.3s ease;
        `;
        
        const modal = overlay.querySelector('.success-modal');
        modal.style.cssText = `
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            text-align: center;
            max-width: 400px;
            margin: 1rem;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        `;
        
        const icon = overlay.querySelector('.success-icon');
        icon.style.cssText = `
            width: 60px;
            height: 60px;
            background: #10B981;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            margin: 0 auto 1rem;
        `;
        
        const button = overlay.querySelector('.success-close');
        button.style.cssText = `
            background: #FF6B35;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            margin-top: 1rem;
            font-weight: 600;
        `;
        
        document.body.appendChild(overlay);
        
        // Reset form
        this.form.reset();
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 5000);
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.cssText = `
            background: #FEE2E2;
            color: #DC2626;
            padding: 1rem;
            border-radius: 0.5rem;
            margin-top: 1rem;
            border: 1px solid #FECACA;
        `;
        errorDiv.textContent = message;
        
        this.form.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }

    // FAQ Functionality
    setupFAQ() {
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const faqItem = question.parentElement;
                const isActive = faqItem.classList.contains('active');
                
                // Close all other FAQ items
                document.querySelectorAll('.faq-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Toggle current item
                if (!isActive) {
                    faqItem.classList.add('active');
                }
            });
        });
    }

    // Smooth Scrolling
    handleSmoothScroll(event) {
        event.preventDefault();
        const targetId = event.target.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            const offsetTop = targetElement.offsetTop - 80; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    scrollToForm() {
        const form = document.getElementById('lead-form');
        if (form) {
            const offsetTop = form.offsetTop - 100;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
            
            // Focus on first input
            setTimeout(() => {
                const firstInput = form.querySelector('input');
                if (firstInput) {
                    firstInput.focus();
                }
            }, 500);
        }
    }

    // Scroll to section helper
    scrollToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const offsetTop = section.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    }

    // Scroll Effects
    handleScroll() {
        const scrollY = window.scrollY;
        
        // Navbar background
        if (this.navbar) {
            if (scrollY > 50) {
                this.navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                this.navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                this.navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                this.navbar.style.boxShadow = 'none';
            }
        }
        
        // Trigger animations for elements coming into view
        this.triggerAnimations();
    }

    setupScrollEffects() {
        window.addEventListener('scroll', this.handleScroll.bind(this));
    }

    // Animation System
    setupAnimations() {
        // Add intersection observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.value-card, .testimonial-card, .step, .section-header').forEach(el => {
            observer.observe(el);
        });
    }

    triggerAnimations() {
        // Additional animation triggers can be added here
    }

    // Mobile Menu
    setupMobileMenu() {
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', () => {
                const navLinks = document.querySelector('.nav-links');
                if (navLinks) {
                    navLinks.classList.toggle('mobile-active');
                }
            });
        }
    }

    // Form Validation Setup
    setupFormValidation() {
        // Real-time validation as user types
        document.querySelectorAll('input[type="tel"]').forEach(input => {
            input.addEventListener('input', (e) => {
                // Format phone number as user types
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 6) {
                    value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
                } else if (value.length >= 3) {
                    value = value.replace(/(\d{3})(\d{3})/, '($1) $2');
                }
                e.target.value = value;
            });
        });
    }

    // Utility Methods
    formatPhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return '(' + match[1] + ') ' + match[2] + '-' + match[3];
        }
        return phone;
    }

    // Analytics Integration (Google Analytics, Facebook Pixel, etc.)
    trackEvent(eventName, properties = {}) {
        // Google Analytics 4
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
        
        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', eventName, properties);
        }
        
        console.log('Event tracked:', eventName, properties);
    }

    // Track form submission
    trackFormSubmission() {
        this.trackEvent('form_submit', {
            form_name: 'lead_form',
            page_url: window.location.href
        });
    }
}

// Global functions for backwards compatibility
function scrollToForm() {
    window.pinnacleWebsite.scrollToForm();
}

function scrollToSection(sectionId) {
    window.pinnacleWebsite.scrollToSection(sectionId);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pinnacleWebsite = new PinnacleWebsite();
    console.log('Pinnacle Realty Partners website initialized 🏠');
});

// PWA Service Worker Registration - COMPLETELY REMOVED FOR DEBUGGING

// Performance optimization
window.addEventListener('load', () => {
    // Preload important resources
    const preloadLinks = [
        'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap'
    ];
    
    preloadLinks.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = href;
        document.head.appendChild(link);
    });
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('JavaScript error:', event.error);
    // You could send this to an error tracking service
});

// Email Protection System
function contactEmail() {
    // Base64 encoded email: info@pinnaclepropdeals.com
    const encodedEmail = 'aW5mb0BwaW5uYWNsZXByb3BkZWFscy5jb20=';
    const email = atob(encodedEmail);
    
    // Update display text
    const emailDisplay = document.getElementById('email-display');
    if (emailDisplay) {
        emailDisplay.textContent = email;
    }
    
    // Create mailto link
    window.location.href = 'mailto:' + email;
}

function revealEmail(elementId) {
    // Base64 encoded email: info@pinnaclepropdeals.com
    const encodedEmail = 'aW5mb0BwaW5uYWNsZXByb3BkZWFscy5jb20=';
    const email = atob(encodedEmail);
    
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = email;
        element.href = 'mailto:' + email;
        element.onclick = null; // Remove the onclick after revealing
    }
}

// Obfuscated email display for static text
function getObfuscatedEmail() {
    // Returns email with some characters replaced
    return 'info [at] pinnaclepropdeals [dot] com';
}

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PinnacleWebsite;
}