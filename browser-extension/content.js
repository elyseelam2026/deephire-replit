// Content script that runs on LinkedIn profile pages
console.log('[DeepHire] Extension loaded on LinkedIn profile page');

// Function to extract profile data from LinkedIn DOM
function extractLinkedInProfile() {
  try {
    const data = {
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Extract name - multiple possible selectors
    const nameElement = document.querySelector('h1.text-heading-xlarge') || 
                       document.querySelector('.pv-text-details__left-panel h1') ||
                       document.querySelector('.ph5.pb5 h1');
    data.name = nameElement?.textContent?.trim() || '';

    // Extract headline/title
    const headlineElement = document.querySelector('.text-body-medium.break-words') ||
                           document.querySelector('.pv-text-details__left-panel .text-body-medium') ||
                           document.querySelector('.ph5.pb5 .text-body-medium');
    data.headline = headlineElement?.textContent?.trim() || '';

    // Extract location
    const locationElement = document.querySelector('.text-body-small.inline.t-black--light.break-words') ||
                           document.querySelector('.pv-text-details__left-panel .pb2 span.text-body-small');
    data.location = locationElement?.textContent?.trim() || '';

    // Extract about/summary section
    const aboutSection = document.querySelector('#about') || document.querySelector('[data-section="about"]');
    if (aboutSection) {
      const aboutText = aboutSection.closest('section')?.querySelector('.display-flex.full-width')?.textContent?.trim() ||
                       aboutSection.closest('section')?.querySelector('.pv-shared-text-with-see-more')?.textContent?.trim() ||
                       aboutSection.closest('section')?.querySelector('.inline-show-more-text')?.textContent?.trim();
      data.about = aboutText || '';
    }

    // Extract experience section
    data.experience = [];
    const experienceSection = document.querySelector('#experience') || document.querySelector('[data-section="experience"]');
    if (experienceSection) {
      const experienceItems = experienceSection.closest('section')?.querySelectorAll('li.artdeco-list__item') || [];
      
      experienceItems.forEach(item => {
        const titleElement = item.querySelector('.display-flex.align-items-center.mr1.t-bold span[aria-hidden="true"]') ||
                            item.querySelector('.mr1.t-bold span') ||
                            item.querySelector('[data-field="experience-company-name"]');
        
        const companyElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]') ||
                              item.querySelector('.t-14.t-normal span');
        
        const dateElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]') ||
                           item.querySelector('.pvs-entity__caption-wrapper');
        
        const descriptionElement = item.querySelector('.inline-show-more-text span[aria-hidden="true"]') ||
                                  item.querySelector('.pv-shared-text-with-see-more span');

        const exp = {
          title: titleElement?.textContent?.trim() || '',
          company: companyElement?.textContent?.trim() || '',
          dates: dateElement?.textContent?.trim() || '',
          description: descriptionElement?.textContent?.trim() || ''
        };

        // Only add if we have at least a title or company
        if (exp.title || exp.company) {
          data.experience.push(exp);
        }
      });
    }

    // Extract education section
    data.education = [];
    const educationSection = document.querySelector('#education') || document.querySelector('[data-section="education"]');
    if (educationSection) {
      const educationItems = educationSection.closest('section')?.querySelectorAll('li.artdeco-list__item') || [];
      
      educationItems.forEach(item => {
        const schoolElement = item.querySelector('.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]') ||
                             item.querySelector('.mr1.t-bold span');
        
        const degreeElement = item.querySelector('.t-14.t-normal span[aria-hidden="true"]') ||
                             item.querySelector('.t-14.t-normal span');
        
        const dateElement = item.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]');

        const edu = {
          school: schoolElement?.textContent?.trim() || '',
          degree: degreeElement?.textContent?.trim() || '',
          dates: dateElement?.textContent?.trim() || ''
        };

        // Only add if we have at least a school
        if (edu.school) {
          data.education.push(edu);
        }
      });
    }

    // Extract skills section
    data.skills = [];
    const skillsSection = document.querySelector('#skills') || document.querySelector('[data-section="skills"]');
    if (skillsSection) {
      const skillItems = skillsSection.closest('section')?.querySelectorAll('li.artdeco-list__item span[aria-hidden="true"]') || [];
      skillItems.forEach(item => {
        const skill = item.textContent?.trim();
        if (skill && !data.skills.includes(skill)) {
          data.skills.push(skill);
        }
      });
    }

    console.log('[DeepHire] Extracted profile data:', data);
    return data;
  } catch (error) {
    console.error('[DeepHire] Error extracting profile:', error);
    return null;
  }
}

// Function to create the floating button
function createDeepHireButton() {
  // Check if button already exists
  if (document.getElementById('deephire-import-btn')) {
    return;
  }

  const button = document.createElement('button');
  button.id = 'deephire-import-btn';
  button.textContent = '📥 Import to DeepHire';
  button.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 999999;
    padding: 12px 24px;
    background: linear-gradient(135deg, #0a66c2 0%, #004182 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  button.addEventListener('mouseenter', () => {
    button.style.transform = 'translateY(-2px)';
    button.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'translateY(0)';
    button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = '⏳ Extracting...';

    try {
      const profileData = extractLinkedInProfile();
      
      if (!profileData || !profileData.name) {
        throw new Error('Could not extract profile data. Please make sure the page is fully loaded.');
      }

      // Send to background script
      chrome.runtime.sendMessage({
        type: 'IMPORT_PROFILE',
        data: profileData
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('[DeepHire] Runtime error:', chrome.runtime.lastError);
          button.textContent = '❌ Error - Check Settings';
          button.style.background = '#dc2626';
          setTimeout(() => {
            button.disabled = false;
            button.textContent = '📥 Import to DeepHire';
            button.style.background = 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)';
          }, 3000);
          return;
        }

        if (response && response.success) {
          button.textContent = '✅ Imported Successfully!';
          button.style.background = '#16a34a';
          setTimeout(() => {
            button.disabled = false;
            button.textContent = '📥 Import to DeepHire';
            button.style.background = 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)';
          }, 3000);
        } else {
          button.textContent = '❌ ' + (response?.error || 'Import Failed');
          button.style.background = '#dc2626';
          setTimeout(() => {
            button.disabled = false;
            button.textContent = '📥 Import to DeepHire';
            button.style.background = 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)';
          }, 3000);
        }
      });
    } catch (error) {
      console.error('[DeepHire] Error:', error);
      button.textContent = '❌ ' + error.message;
      button.style.background = '#dc2626';
      setTimeout(() => {
        button.disabled = false;
        button.textContent = '📥 Import to DeepHire';
        button.style.background = 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)';
      }, 3000);
    }
  });

  document.body.appendChild(button);
}

// Wait for page to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createDeepHireButton, 1000);
  });
} else {
  setTimeout(createDeepHireButton, 1000);
}

// Re-create button on navigation (LinkedIn is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (url.includes('/in/')) {
      setTimeout(createDeepHireButton, 2000);
    } else {
      const button = document.getElementById('deephire-import-btn');
      if (button) {
        button.remove();
      }
    }
  }
}).observe(document, { subtree: true, childList: true });
