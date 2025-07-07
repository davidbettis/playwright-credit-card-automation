#!/usr/local/bin/node

const { chromium } = require('playwright');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

// Create downloads directory if it doesn't exist
const downloadsDir = './downloads';
if (!fs.existsSync(downloadsDir)) {
     fs.mkdirSync(downloadsDir, { recursive: true });
}

async function runChaseScript() {
    // Launch browser
    const browser = await chromium.launch({ 
        headless: false,  // Keep browser visible for manual authentication
        slowMo: 1000,     // Add delay between actions for better visibility
        args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    
    const context = await browser.newContext({
        acceptDownloads: true, // Enable downloads
        downloadsPath: downloadsDir
    });
    const page = await context.newPage();

    try {
        console.log('Opening chase.com...');
        await page.goto('https://chase.com');
        
        console.log('Page loaded. Please complete authentication manually.');
        console.log('Press Enter in this terminal when you are ready to continue...');
        
        // Wait for user input
        await waitForEnter();
        
        console.log('Continuing script...');
        
        // Wait a moment for any page transitions to complete
        await page.waitForTimeout(2000);
        
        // Look for the "See all transactions" button and click it
        console.log('Searching for "See all transactions" button...');
        
        try {
            // Try to find the button using various selectors
            const button = await page.locator('text="See all transactions"').first();
            
            if (await button.isVisible()) {
                console.log('✅ Found "See all transactions" button on the page!');
                
                // Get the element's position and other details
                const boundingBox = await button.boundingBox();
                console.log(`Button position: x=${boundingBox.x}, y=${boundingBox.y}`);
                
                // Highlight the button before clicking (optional)
                await button.highlight();
                
                // Click the button
                console.log('Clicking "See all transactions" button...');
                await button.click();
                
                // Wait for navigation or page changes
                await page.waitForTimeout(2000);
                
                console.log('✅ Successfully clicked "See all transactions" button!');
                
            } else {
                console.log('❌ "See all transactions" button is not visible on the page.');
            }
        } catch (error) {
            console.log('❌ "See all transactions" button not found on the page.');
            
            // Try alternative search methods
            console.log('Trying alternative search methods...');
            
            // Search for buttons with partial text matches
            const partialMatches = await page.locator('button:has-text("transactions")').all();
            if (partialMatches.length > 0) {
                console.log(`Found ${partialMatches.length} buttons with "transactions" text.`);
                for (let i = 0; i < partialMatches.length; i++) {
                    const buttonText = await partialMatches[i].textContent();
                    console.log(`Button ${i + 1}: "${buttonText}"`);
                }
            }
            
            // Also search for links with transaction text
            const linkMatches = await page.locator('a:has-text("transactions")').all();
            if (linkMatches.length > 0) {
                console.log(`Found ${linkMatches.length} links with "transactions" text.`);
                for (let i = 0; i < linkMatches.length; i++) {
                    const linkText = await linkMatches[i].textContent();
                    console.log(`Link ${i + 1}: "${linkText}"`);
                }
            }
            
            // Search in all text content
            const pageContent = await page.textContent('body');
            if (pageContent.toLowerCase().includes('see all transactions')) {
                console.log('✅ Found "see all transactions" in page content (case-insensitive)');
            } else if (pageContent.toLowerCase().includes('transactions')) {
                console.log('Found "transactions" text in page content');
            } else {
                console.log('No transaction-related text found in page content');
            }
        }
        
        // Now search for the download activity button
        console.log('Searching for download activity button...');
        
        try {
            // Try multiple selectors to find the download button
            let downloadButton = null;
            
            // Try by data-testid first (most reliable)
            downloadButton = await page.locator('[data-testid="quick-action-download-activity-tooltip-button"]').first();
            
            if (await downloadButton.isVisible()) {
                console.log('✅ Found download activity button by data-testid!');
            } else {
                // Try by ID
                downloadButton = await page.locator('#quick-action-download-activity-tooltip').first();
                
                if (await downloadButton.isVisible()) {
                    console.log('✅ Found download activity button by ID!');
                } else {
                    // Try by aria-label
                    downloadButton = await page.locator('[aria-label="Download account activity"]').first();
                    
                    if (await downloadButton.isVisible()) {
                        console.log('✅ Found download activity button by aria-label!');
                    } else {
                        throw new Error('Download button not found with any selector');
                    }
                }
            }
            
            // Get the element's position and other details
            const boundingBox = await downloadButton.boundingBox();
            console.log(`Download button position: x=${boundingBox.x}, y=${boundingBox.y}`);
            
            // Highlight the button before clicking
            await downloadButton.highlight();
            
            // Click the download button
            console.log('Clicking download activity button...');
            await downloadButton.click();
            
            // Wait for download dialog or page changes
            await page.waitForTimeout(3000);
            
            console.log('✅ Successfully clicked download activity button!');
            
        } catch (error) {
            console.log('❌ Download activity button not found or not clickable.');
            console.log('Error:', error.message);
            
            // Try to find similar buttons
            console.log('Searching for similar download buttons...');
            
            const downloadButtons = await page.locator('button:has-text("download")').all();
            if (downloadButtons.length > 0) {
                console.log(`Found ${downloadButtons.length} buttons with "download" text.`);
                for (let i = 0; i < downloadButtons.length; i++) {
                    const buttonText = await downloadButtons[i].textContent();
                    const ariaLabel = await downloadButtons[i].getAttribute('aria-label');
                    console.log(`Button ${i + 1}: "${buttonText}" (aria-label: "${ariaLabel}")`);
                }
            }
            
            // Also search for buttons with download-related aria-labels
            const ariaDownloadButtons = await page.locator('[aria-label*="download" i]').all();
            if (ariaDownloadButtons.length > 0) {
                console.log(`Found ${ariaDownloadButtons.length} buttons with download-related aria-labels.`);
                for (let i = 0; i < ariaDownloadButtons.length; i++) {
                    const ariaLabel = await ariaDownloadButtons[i].getAttribute('aria-label');
                    console.log(`Button ${i + 1} aria-label: "${ariaLabel}"`);
                }
            }
        }
        
        // Now find and iterate through the Angular select dropdown
        await iterateDropdownOptions(page);
        
        console.log('Script completed. Press Enter to close browser...');
        await waitForEnter();
        
    } catch (error) {
        console.error('Error occurred:', error);
    } finally {
        await browser.close();
    }
}

// Add this helper function to save response bodies manually
// This should be called from your main script context (not browser context)
async function saveResponseToFile(buffer, filename, downloadsDir = './downloads') {
    const fs = require('fs');
    const path = require('path');
    
    // Create downloads directory if it doesn't exist
    if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    const filepath = path.join(downloadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log(`✅ File saved manually to: ${filepath}`);
    return filepath;
}

async function selectOption(selectElement, option, currentIndex, totalOptions, page) {
    console.log(`\n--- Processing option ${currentIndex}/${totalOptions} ---`);
    console.log(`Option name: "${option.name}"`);
    console.log(`Option value: "${option.value}"`);
    console.log(`Option index: ${option.index}`);
    
    try {
        // Click on the select to open the dropdown
        console.log('Opening dropdown...');
        await selectElement.click();
        
        // Wait for dropdown to open
        await page.waitForTimeout(1000);
        
        // Try to find and click the specific option using value-based selectors
        const optionSelectors = [
            `[data-value="${option.value}"]`,
            `[value="${option.value}"]`,
            `mds-option[value="${option.value}"]`
        ];
        
        let optionSelected = false;
        
        for (const selector of optionSelectors) {
            try {
                const optionElement = await page.locator(selector).first();
                if (await optionElement.isVisible({ timeout: 2000 })) {
                    console.log(`Found option using selector: ${selector}`);
                    await optionElement.click();
                    optionSelected = true;
                    break;
                }
            } catch (selectorError) {
                // Continue to next selector
            }
        }
        
        if (!optionSelected) {
            console.log('Could not find clickable option element, trying keyboard navigation...');
            
            // Try using keyboard navigation
            await selectElement.press('ArrowDown');
            await page.waitForTimeout(500);
            await selectElement.press('Enter');
        }
        
        // Wait for selection to complete
        await page.waitForTimeout(1000);
        
        // Verify the selection by checking the current value
        const currentValue = await selectElement.getAttribute('value');
        console.log(`Current selected value: "${currentValue}"`);
        
        if (currentValue === option.value) {
            console.log('✅ Successfully selected option!');
        } else {
            console.log('⚠️  Option may not have been selected correctly');
        }
        
        // Wait for any page updates after account selection
        await page.waitForTimeout(2000);
        
        // Now handle the Activity dropdown - select "Since last statement"
        console.log('Looking for Activity dropdown...');
        
        try {
            // Find the Activity dropdown using multiple selector strategies
            const activitySelectors = [
                '#select-downloadActivityOptionId',
                'button[aria-labelledby="label-value-announcement-downloadActivityOptionId"]',
                '.mds-select__select--box:has-text("Since last statement")',
                'button:has-text("Since last statement")'
            ];
            
            let activityDropdown = null;
            
            for (const selector of activitySelectors) {
                try {
                    const element = await page.locator(selector).first();
                    if (await element.isVisible({ timeout: 3000 })) {
                        console.log(`Found Activity dropdown using selector: ${selector}`);
                        activityDropdown = element;
                        break;
                    }
                } catch (selectorError) {
                    // Continue to next selector
                }
            }
            
            if (activityDropdown) {
                console.log('✅ Found Activity dropdown!');
                
                // Check if "Since last statement" is already selected
                const currentText = await activityDropdown.textContent();
                console.log(`Current Activity dropdown text: "${currentText}"`);
                
                if (currentText && currentText.includes('Since last statement')) {
                    console.log('✅ "Since last statement" is already selected!');
                    // If "Since last statement" was already selected, proceed to download
                    await clickDownloadButton(page);
                } else {
                    console.log('Clicking Activity dropdown to open options...');
                    await activityDropdown.click();
                    
                    // Wait for dropdown options to appear
                    await page.waitForTimeout(1000);
                    
                    // Try to find and click "Since last statement" option
                    const statementOptionSelectors = [
                        'mds-option:has-text("Since last statement")',
                        '[role="option"]:has-text("Since last statement")',
                        '.mds-select__option:has-text("Since last statement")',
                        'div:has-text("Since last statement")'
                    ];
                    
                    let statementOptionSelected = false;
                    
                    for (const selector of statementOptionSelectors) {
                        try {
                            const optionElement = await page.locator(selector).first();
                            if (await optionElement.isVisible({ timeout: 2000 })) {
                                console.log(`Found "Since last statement" option using selector: ${selector}`);
                                await optionElement.click();
                                statementOptionSelected = true;
                                break;
                            }
                        } catch (selectorError) {
                            // Continue to next selector
                        }
                    }
                    
                    if (!statementOptionSelected) {
                        console.log('Could not find "Since last statement" option, trying keyboard navigation...');
                        
                        // Try keyboard navigation to find the option
                        await activityDropdown.press('ArrowDown');
                        await page.waitForTimeout(500);
                        
                        // Check if we found "Since last statement"
                        const highlightedText = await page.locator('[aria-selected="true"], .mds-select__option--highlighted').textContent().catch(() => '');
                        
                        if (highlightedText.includes('Since last statement')) {
                            await activityDropdown.press('Enter');
                            statementOptionSelected = true;
                        } else {
                            // Try a few more arrow downs
                            for (let i = 0; i < 3; i++) {
                                await activityDropdown.press('ArrowDown');
                                await page.waitForTimeout(300);
                                
                                const currentHighlighted = await page.locator('[aria-selected="true"], .mds-select__option--highlighted').textContent().catch(() => '');
                                if (currentHighlighted.includes('Since last statement')) {
                                    await activityDropdown.press('Enter');
                                    statementOptionSelected = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    if (statementOptionSelected) {
                        console.log('✅ Successfully selected "Since last statement" option!');
                        
                        // Wait for selection to complete
                        await page.waitForTimeout(1000);
                        
                        // Verify the selection
                        const finalText = await activityDropdown.textContent();
                        console.log(`Final Activity dropdown text: "${finalText}"`);
                        
                        if (finalText && finalText.includes('Since last statement')) {
                            console.log('✅ "Since last statement" selection confirmed!');
                            
                            // Now click the Download button
                            await clickDownloadButton(page);
                            
                        } else {
                            console.log('⚠️  "Since last statement" selection may not have been applied correctly');
                        }
                    } else {
                        console.log('❌ Could not select "Since last statement" option');
                    }
                }
            } else {
                console.log('❌ Activity dropdown not found');
                
                // Debug: show what select elements are available
                console.log('Available select elements on page:');
                const allSelects = await page.locator('select, button[aria-haspopup="listbox"], .mds-select__select').all();
                for (let i = 0; i < allSelects.length; i++) {
                    const elementInfo = await allSelects[i].evaluate(el => ({
                        tagName: el.tagName,
                        id: el.id,
                        className: el.className,
                        textContent: el.textContent?.trim()
                    }));
                    console.log(`Select ${i + 1}:`, elementInfo);
                }
            }
            
        } catch (activityError) {
            console.log('❌ Error handling Activity dropdown:', activityError.message);
        }
        
        // Wait before next iteration
        await page.waitForTimeout(2000);
        
    } catch (optionError) {
        console.log(`❌ Error selecting option "${option.name}":`, optionError.message);
    }
}

async function clickDownloadButton(page) {
    console.log('Looking for Download button...');
    
    try {
        // Multiple selector strategies for the Download button
        const downloadButtonSelectors = [
            'button.button--primary:has-text("Download")',
            'button:has-text("Download")',
            'button .button__label:has-text("Download")',
            '.button--primary .button__label:has-text("Download")',
            'button[type="button"]:has-text("Download")',
            '.button.button--primary.button--fluid'
        ];
        
        let downloadButton = null;
        
        for (const selector of downloadButtonSelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible({ timeout: 3000 })) {
                    console.log(`Found Download button using selector: ${selector}`);
                    downloadButton = element;
                    break;
                }
            } catch (selectorError) {
                // Continue to next selector
            }
        }
        
        if (downloadButton) {
            console.log('✅ Found Download button!');
            
            // Get button text to confirm it's the right button
            const buttonText = await downloadButton.textContent();
            console.log(`Download button text: "${buttonText}"`);
            
            // Get the element's position for debugging
            const boundingBox = await downloadButton.boundingBox();
            if (boundingBox) {
                console.log(`Download button position: x=${boundingBox.x}, y=${boundingBox.y}`);
            }
            
            // Wait a moment to ensure the page is ready
            await page.waitForTimeout(500);
            
            // Click the Download button
            console.log('Clicking Download button...');
            
            // Set up multiple download detection strategies
            const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
            
            // Click the button
            await downloadButton.click();
            
            // Wait for either download event or download response
            console.log('Waiting for download to start...');
            try {
                const result = await Promise.race([
                    downloadPromise.then(download => ({ type: 'download', download }))
                ]);
                
                if (result.type === 'download') {
                    const download = result.download;
                    const filename = download.suggestedFilename();
                    console.log(`✅ Download started: ${filename}`);
                    
                    // Create downloads directory if it doesn't exist and save the download
                    const downloadsDir = './downloads';
                    
                    // Save the download to a specific location
                    const downloadPath = `${downloadsDir}/${filename}`;
                    await download.saveAs(downloadPath);
                    console.log(`✅ Download saved to: ${downloadPath}`);
                    
                    // Verify the file was saved
                    try {
                        const stats = await download.path();
                        if (stats) {
                            console.log(`✅ Download completed successfully: ${uniqueFilename}`);
                        }
                    } catch (pathError) {
                        console.log('⚠️  Could not verify download path');
                    }
                }                
            } catch (e) {
                console.log('⚠️  Failed to download file');
                console.error(e, e.stack);

                console.log('Checking for alternative download methods...');
                
                // Check if the page URL changed or if there are any new windows/tabs
                const currentUrl = page.url();
                console.log(`Current page URL: ${currentUrl}`);
                
                // Check for any new tabs that might have opened
                const pages = await page.context().pages();
                console.log(`Number of open pages: ${pages.length}`);
                
                // Check for any popup windows or alerts
                try {
                    const popupPromise = page.waitForEvent('popup', { timeout: 2000 });
                    const popup = await popupPromise;
                    console.log(`Popup detected: ${popup.url()}`);
                } catch (popupError) {
                    console.log('No popup detected');
                }
                
                // Check if the button state changed (might indicate processing)
                const buttonTextAfter = await downloadButton.textContent();
                const isButtonDisabled = await downloadButton.isDisabled();
                console.log(`Button text after click: "${buttonTextAfter}"`);
                console.log(`Button disabled: ${isButtonDisabled}`);
                
                // Look for any loading indicators or messages
                const loadingIndicators = await page.locator('.loading, .spinner, [aria-busy="true"], .downloading').all();
                if (loadingIndicators.length > 0) {
                    console.log(`Found ${loadingIndicators.length} loading indicators`);
                }
                
                // Check for any error messages
                const errorMessages = await page.locator('.error, .alert, .warning, [role="alert"]').all();
                if (errorMessages.length > 0) {
                    console.log(`Found ${errorMessages.length} error/alert messages`);
                    for (let i = 0; i < errorMessages.length; i++) {
                        const message = await errorMessages[i].textContent();
                        console.log(`Error message ${i + 1}: "${message}"`);
                    }
                }
            }
            
            // Check if download started or if there's a success message
            try {
                // Look for common download indicators
                const downloadIndicators = [
                    'text="Download started"',
                    'text="Download complete"',
                    'text="File downloaded"',
                    '[aria-live="polite"]',
                    '.success-message',
                    '.download-success'
                ];
                
                for (const indicator of downloadIndicators) {
                    try {
                        const element = await page.locator(indicator).first();
                        if (await element.isVisible({ timeout: 1000 })) {
                            const message = await element.textContent();
                            console.log(`✅ Download indicator found: "${message}"`);
                            break;
                        }
                    } catch (indicatorError) {
                        // Continue to next indicator
                    }
                }
            } catch (indicatorError) {
                console.log('No download indicators found (this may be normal)');
            }
            
            // Now click the "Download other activity" button
            await clickDownloadOtherActivityButton(page);
            
        } else {
            console.log('❌ Download button not found');
            
            // Debug: show what buttons are available
            console.log('Available buttons on page:');
            const allButtons = await page.locator('button').all();
            for (let i = 0; i < Math.min(allButtons.length, 10); i++) { // Limit to first 10 buttons
                const buttonInfo = await allButtons[i].evaluate(el => ({
                    textContent: el.textContent?.trim(),
                    className: el.className,
                    type: el.type,
                    disabled: el.disabled
                }));
                console.log(`Button ${i + 1}:`, buttonInfo);
            }
        }
        
    } catch (downloadError) {
        console.log('❌ Error clicking Download button:', downloadError.message);
    }
}

async function clickDownloadOtherActivityButton(page) {
    console.log('Looking for "Download other activity" button...');
    
    try {
        // Wait a moment for the page to update after the download
        await page.waitForTimeout(2000);
        
        // Multiple selector strategies for the "Download other activity" button
        const downloadOtherActivitySelectors = [
            'button.button--secondary:has-text("Download other activity")',
            'button:has-text("Download other activity")',
            'button .button__label:has-text("Download other activity")',
            '.button--secondary .button__label:has-text("Download other activity")',
            'button[type="button"]:has-text("Download other activity")',
            '.button.button--secondary.button--fluid:has-text("Download other activity")',
            'span.button__label:has-text("Download other activity")',
            '.button--secondary:has(.button__label:has-text("Download other activity"))'
        ];
        
        let downloadOtherActivityButton = null;
        
        for (const selector of downloadOtherActivitySelectors) {
            try {
                const element = await page.locator(selector).first();
                if (await element.isVisible({ timeout: 3000 })) {
                    console.log(`Found "Download other activity" button using selector: ${selector}`);
                    downloadOtherActivityButton = element;
                    break;
                }
            } catch (selectorError) {
                // Continue to next selector
            }
        }
        
        if (downloadOtherActivityButton) {
            console.log('✅ Found "Download other activity" button!');
            
            // Get button text to confirm it's the right button
            const buttonText = await downloadOtherActivityButton.textContent();
            console.log(`"Download other activity" button text: "${buttonText}"`);
            
            // Get the element's position for debugging
            const boundingBox = await downloadOtherActivityButton.boundingBox();
            if (boundingBox) {
                console.log(`"Download other activity" button position: x=${boundingBox.x}, y=${boundingBox.y}`);
            }
            
            // Check if button is enabled
            const isDisabled = await downloadOtherActivityButton.isDisabled();
            if (isDisabled) {
                console.log('⚠️  "Download other activity" button is disabled');
                return;
            }
            
            // Wait a moment to ensure the page is ready
            await page.waitForTimeout(500);
            
            // Click the "Download other activity" button
            console.log('Clicking "Download other activity" button...');
            await downloadOtherActivityButton.click();
            
            // Wait for any page transitions or modals to appear
            await page.waitForTimeout(2000);
            
            console.log('✅ Successfully clicked "Download other activity" button!');
            
            // Check if we're back to the account selection or if a new form appeared
            try {
                // Look for indicators that the process is ready to start over
                const nextStepIndicators = [
                    'mds-select#account-selector', // Back to account selector
                    'text="Select account"',
                    'text="Activity"',
                    '.mds-select__container',
                    'button:has-text("Download")'
                ];
                
                for (const indicator of nextStepIndicators) {
                    try {
                        const element = await page.locator(indicator).first();
                        if (await element.isVisible({ timeout: 2000 })) {
                            console.log(`✅ Ready for next iteration - found: ${indicator}`);
                            break;
                        }
                    } catch (indicatorError) {
                        // Continue to next indicator
                    }
                }
            } catch (indicatorError) {
                console.log('No next step indicators found (this may be normal)');
            }
            
        } else {
            console.log('❌ "Download other activity" button not found');
            
            // Debug: show what secondary buttons are available
            console.log('Available secondary buttons on page:');
            const secondaryButtons = await page.locator('button.button--secondary, .button--secondary').all();
            for (let i = 0; i < secondaryButtons.length; i++) {
                const buttonInfo = await secondaryButtons[i].evaluate(el => ({
                    textContent: el.textContent?.trim(),
                    className: el.className,
                    type: el.type,
                    disabled: el.disabled
                }));
                console.log(`Secondary button ${i + 1}:`, buttonInfo);
            }
            
            // Also show all buttons that might contain "other" or "activity"
            console.log('Buttons containing "other" or "activity":');
            const activityButtons = await page.locator('button:has-text("other"), button:has-text("activity")').all();
            for (let i = 0; i < activityButtons.length; i++) {
                const buttonInfo = await activityButtons[i].evaluate(el => ({
                    textContent: el.textContent?.trim(),
                    className: el.className,
                    type: el.type,
                    disabled: el.disabled
                }));
                console.log(`Activity-related button ${i + 1}:`, buttonInfo);
            }
        }
        
    } catch (downloadOtherActivityError) {
        console.log('❌ Error clicking "Download other activity" button:', downloadOtherActivityError.message);
    }
}

async function iterateDropdownOptions(page) {
    console.log('Searching for Angular select dropdown...');
    
    try {
        // Find the mds-select element
        const selectElement = await page.locator('mds-select#account-selector').first();
        
        if (await selectElement.isVisible()) {
            console.log('✅ Found Angular select dropdown!');
            
            // Get the options from the HTML attribute
            const optionsAttribute = await selectElement.getAttribute('options');
            console.log('Options attribute:', optionsAttribute);
            
            // Parse the options JSON
            const options = JSON.parse(optionsAttribute.replace(/&quot;/g, '"'));
            console.log(`Found ${options.length} options in the dropdown:`, options);
            
            // Iterate through each option
            for (let i = 0; i < options.length; i++) {
                await selectOption(selectElement, options[i], i + 1, options.length, page);
            }
            
            console.log('\n✅ Finished iterating through all dropdown options!');
            
        } else {
            console.log('❌ Angular select dropdown not visible on the page.');
        }
        
    } catch (error) {
        console.log('❌ Angular select dropdown not found or error occurred.');
        console.log('Error:', error.message);
        
        // Try to find similar select elements
        console.log('Searching for similar select elements...');
        
        const selectElements = await page.locator('select, mds-select, [role="combobox"]').all();
        if (selectElements.length > 0) {
            console.log(`Found ${selectElements.length} select-like elements.`);
            for (let i = 0; i < selectElements.length; i++) {
                const tagName = await selectElements[i].evaluate(el => el.tagName);
                const id = await selectElements[i].getAttribute('id');
                const className = await selectElements[i].getAttribute('class');
                console.log(`Element ${i + 1}: <${tagName}> id="${id}" class="${className}"`);
            }
        }
    }
}

function waitForEnter() {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.on('line', () => {
            rl.close();
            resolve();
        });
    });
}

// Run the script
runChaseScript().catch(console.error);
