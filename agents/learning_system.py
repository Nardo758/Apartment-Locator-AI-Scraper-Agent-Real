"""
Watch and Learn System for Rental Data Scraper
Implements interactive training and human-in-the-loop learning capabilities.
"""

import asyncio
import json
import time
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path

from playwright.async_api import async_playwright
from template_manager import TemplateManager


@dataclass
class RecordedAction:
    """Represents a recorded user action"""
    action_type: str
    selector: str
    timestamp: str
    url: str
    element_text: Optional[str] = None
    element_html: Optional[str] = None


@dataclass
class LearnedPath:
    """Represents a learned navigation path"""
    domain: str
    demonstration_date: str
    success_rate: float
    actions: List[Dict[str, Any]]
    extracted_selectors: List[str]
    validation_attempts: int = 0
    last_successful_test: Optional[str] = None


class PlaybackLearner:
    """Learns patterns from Playwright recordings"""

    def __init__(self):
        self.learned_paths = {}

    def parse_playwright_recording(self, generated_code: str) -> Dict[str, List[str]]:
        """Parse Playwright's generated code to learn patterns"""
        patterns = {
            'clicks': [],
            'navigations': [],
            'selectors': [],
            'waits': []
        }

        lines = generated_code.split('\n')
        for line in lines:
            line = line.strip()
            if 'page.click' in line:
                # Extract selector from page.click("selector")
                start = line.find('"')
                end = line.find('"', start + 1)
                if start != -1 and end != -1:
                    selector = line[start + 1:end]
                    patterns['clicks'].append(selector)
                    patterns['selectors'].append(selector)
            elif 'page.goto' in line:
                # Extract URL from page.goto("url")
                start = line.find('"')
                end = line.find('"', start + 1)
                if start != -1 and end != -1:
                    url = line[start + 1:end]
                    patterns['navigations'].append(url)
            elif 'page.locator' in line:
                # Extract selector from page.locator("selector")
                start = line.find('"')
                end = line.find('"', start + 1)
                if start != -1 and end != -1:
                    selector = line[start + 1:end]
                    patterns['selectors'].append(selector)
            elif 'page.wait_for_selector' in line:
                # Extract selector from wait_for_selector
                start = line.find('"')
                end = line.find('"', start + 1)
                if start != -1 and end != -1:
                    selector = line[start + 1:end]
                    patterns['waits'].append(selector)

        return patterns

    def learn_from_demonstration(self, url: str, recorded_actions: List[Dict[str, Any]]) -> LearnedPath:
        """Learn from human demonstration"""
        domain = self.extract_domain(url)

        learned_path = LearnedPath(
            domain=domain,
            demonstration_date=datetime.now().isoformat(),
            success_rate=1.0,  # Human demo is always successful
            actions=recorded_actions,
            extracted_selectors=self.extract_common_selectors(recorded_actions)
        )

        self.learned_paths[domain] = learned_path
        self.save_learned_paths()

        return learned_path

    def extract_common_selectors(self, actions: List[Dict[str, Any]]) -> List[str]:
        """Extract commonly used selectors from actions"""
        selectors = []
        for action in actions:
            if 'selector' in action:
                selectors.append(action['selector'])

        # Remove duplicates while preserving order
        seen = set()
        unique_selectors = []
        for selector in selectors:
            if selector not in seen:
                unique_selectors.append(selector)
                seen.add(selector)

        return unique_selectors

    def extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        return parsed.netloc

    def save_learned_paths(self):
        """Save learned paths to file"""
        data_dir = Path("data/learned_paths")
        data_dir.mkdir(parents=True, exist_ok=True)

        for domain, path in self.learned_paths.items():
            filename = f"{domain.replace('.', '_')}.json"
            filepath = data_dir / filename

            with open(filepath, 'w') as f:
                json.dump({
                    'domain': path.domain,
                    'demonstration_date': path.demonstration_date,
                    'success_rate': path.success_rate,
                    'actions': path.actions,
                    'extracted_selectors': path.extracted_selectors,
                    'validation_attempts': path.validation_attempts,
                    'last_successful_test': path.last_successful_test
                }, f, indent=2)

    def load_learned_paths(self):
        """Load learned paths from files"""
        data_dir = Path("data/learned_paths")
        if not data_dir.exists():
            return

        for filepath in data_dir.glob("*.json"):
            with open(filepath, 'r') as f:
                data = json.load(f)
                domain = data['domain']
                self.learned_paths[domain] = LearnedPath(
                    domain=domain,
                    demonstration_date=data['demonstration_date'],
                    success_rate=data['success_rate'],
                    actions=data['actions'],
                    extracted_selectors=data['extracted_selectors'],
                    validation_attempts=data.get('validation_attempts', 0),
                    last_successful_test=data.get('last_successful_test')
                )


class InteractiveTrainer:
    """Interactive training system that watches user actions"""

    def __init__(self, template_manager: TemplateManager):
        self.template_manager = template_manager
        self.recording = False
        self.current_session: List[RecordedAction] = []
        self.playback_learner = PlaybackLearner()

    async def start_training_session(self, url: str) -> Optional[LearnedPath]:
        """Start an interactive training session"""
        print("🎬 Starting training session...")
        print("Navigate the site normally. I'll watch and learn!")
        print("Type 'save' when done, 'cancel' to abort.")

        self.recording = True
        self.current_session = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)  # Visible browser for user
            context = await browser.new_context()
            page = await context.new_page()

            # Go to the target URL
            await page.goto(url)
            print(f"🌐 Opened {url} in browser")

            # Set up event listeners
            await self.setup_recording(page)

            # Wait for user to complete navigation
            while self.recording:
                try:
                    user_input = await asyncio.get_event_loop().run_in_executor(
                        None, input, "Training session active (type 'save' or 'cancel'): "
                    )

                    if user_input.strip().lower() == 'save':
                        learned_path = await self.save_training_session(url)
                        await browser.close()
                        return learned_path
                    elif user_input.strip().lower() == 'cancel':
                        print("❌ Training session cancelled")
                        self.current_session = []
                        await browser.close()
                        return None
                except KeyboardInterrupt:
                    print("\n❌ Training session interrupted")
                    self.current_session = []
                    await browser.close()
                    return None

            await browser.close()
            return None

    async def setup_recording(self, page):
        """Set up event listeners to record user actions"""

        # Record clicks
        await page.expose_function('recordClick', self.record_click)
        await page.evaluate("""
            document.addEventListener('click', async (e) => {
                const selector = getSelector(e.target);
                const text = e.target.textContent?.trim() || '';
                const html = e.target.outerHTML;
                await window.recordClick(selector, text, html);
            }, true);

            function getSelector(element) {
                const path = [];
                while (element && element.nodeType === Node.ELEMENT_NODE) {
                    let selector = element.nodeName.toLowerCase();
                    if (element.id) {
                        selector += '#' + element.id;
                        path.unshift(selector);
                        break;
                    } else if (element.className) {
                        selector += '.' + element.className.split(' ').join('.');
                    } else {
                        let sibling = element;
                        let nth = 1;
                        while (sibling.previousElementSibling) {
                            sibling = sibling.previousElementSibling;
                            nth++;
                        }
                        selector += ':nth-of-type(' + nth + ')';
                    }
                    path.unshift(selector);
                    element = element.parentNode;
                }
                return path.join(' > ');
            }
        """)

        # Record page changes
        page.on('framenavigated', lambda frame: self.record_navigation(frame.url))

        # Record form submissions
        await page.expose_function('recordFormSubmit', self.record_form_submit)
        await page.evaluate("""
            document.addEventListener('submit', async (e) => {
                const selector = getSelector(e.target);
                await window.recordFormSubmit(selector);
            }, true);
        """)

    def record_click(self, selector: str, text: str, html: str):
        """Record a click action"""
        if self.recording:
            action = RecordedAction(
                action_type='click',
                selector=selector,
                timestamp=datetime.now().isoformat(),
                url='',  # Will be filled by page navigation handler
                element_text=text,
                element_html=html
            )
            self.current_session.append(action)
            print(f"📹 Recorded click: {selector}" + (f" ('{text}')" if text else ""))

    def record_navigation(self, url: str):
        """Record a navigation action"""
        if self.recording:
            action = RecordedAction(
                action_type='navigate',
                selector='',
                timestamp=datetime.now().isoformat(),
                url=url
            )
            self.current_session.append(action)
            print(f"📹 Recorded navigation: {url}")

    def record_form_submit(self, selector: str):
        """Record a form submission"""
        if self.recording:
            action = RecordedAction(
                action_type='form_submit',
                selector=selector,
                timestamp=datetime.now().isoformat(),
                url=''
            )
            self.current_session.append(action)
            print(f"📹 Recorded form submit: {selector}")

    async def save_training_session(self, url: str) -> LearnedPath:
        """Save the learned navigation path"""
        if not self.current_session:
            print("❌ No actions recorded")
            return None

        # Convert RecordedAction objects to dictionaries
        actions_dict = []
        for action in self.current_session:
            actions_dict.append({
                'type': action.action_type,
                'selector': action.selector,
                'timestamp': action.timestamp,
                'url': action.url,
                'element_text': action.element_text,
                'element_html': action.element_html
            })

        # Learn from the demonstration
        learned_path = self.playback_learner.learn_from_demonstration(url, actions_dict)

        print(f"✅ Learned new path for {learned_path.domain}")
        print(f"📋 Learned actions: {len(learned_path.actions)} steps")
        print(f"🎯 Extracted selectors: {len(learned_path.extracted_selectors)}")

        # Test the learned path
        test_success = await self.test_learned_path(url, learned_path)
        if test_success:
            print("🎉 Learned path validated successfully!")
        else:
            print("⚠️  Learned path needs adjustment")

        return learned_path

    async def test_learned_path(self, url: str, learned_path: LearnedPath) -> bool:
        """Test the learned path to validate it works"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch()
                context = await browser.new_context()
                page = await context.new_page()

                await page.goto(url)

                # Execute the learned actions
                for action in learned_path.actions:
                    try:
                        if action['type'] == 'click' and action['selector']:
                            await page.click(action['selector'], timeout=5000)
                            await asyncio.sleep(1)  # Brief pause
                        elif action['type'] == 'navigate':
                            await page.goto(action['url'])
                        elif action['type'] == 'form_submit' and action['selector']:
                            await page.click(action['selector'], timeout=5000)
                    except Exception as e:
                        print(f"⚠️  Action failed during test: {action['type']} -> {action['selector']}")
                        await browser.close()
                        return False

                await browser.close()
                return True

        except Exception as e:
            print(f"❌ Test failed: {e}")
            return False

    def analyze_session(self, session_actions: List[RecordedAction]) -> List[Dict[str, Any]]:
        """Analyze session to extract the successful path"""
        # Filter out irrelevant actions
        relevant_actions = []
        for action in session_actions:
            if self.is_relevant_action(action):
                relevant_actions.append({
                    'type': action.action_type,
                    'selector': action.selector,
                    'timestamp': action.timestamp,
                    'url': action.url,
                    'element_text': action.element_text,
                    'element_html': action.element_html
                })

        return relevant_actions

    def is_relevant_action(self, action: RecordedAction) -> bool:
        """Determine if an action is relevant for scraping"""
        irrelevant_selectors = ['body', 'html', 'div', 'span']
        selector = action.selector.lower()

        # Check if selector is too generic
        if any(irrelevant in selector for irrelevant in irrelevant_selectors):
            return False

        # Check if this looks like a navigation action we don't care about
        if action.action_type == 'click':
            if any(keyword in selector for keyword in ['menu', 'logo', 'home', 'back', 'close']):
                return False

        return True


class HumanFeedbackSystem:
    """Human-in-the-loop system for when scraper gets stuck"""

    def __init__(self):
        self.feedback_queue = []
        self.pending_verification = {}
        self.trainer = None  # Will be set by parent

    def set_trainer(self, trainer: InteractiveTrainer):
        """Set the trainer instance"""
        self.trainer = trainer

    async def request_human_guidance(self, url: str, current_state: str, failed_selectors: List[str]) -> Dict[str, Any]:
        """Request human help when scraper is stuck"""
        print("🤖 I'm stuck! Need human help...")
        print(f"🌐 Website: {url}")
        print(f"❌ Failed selectors: {failed_selectors}")
        print(f"📍 Current state: {current_state}")

        # Save current state
        session_id = f"help_{int(time.time())}"
        self.pending_verification[session_id] = {
            'url': url,
            'state': current_state,
            'failed_selectors': failed_selectors,
            'requested_at': datetime.now().isoformat()
        }

        # Options for human
        print("\nHow would you like to help?")
        print("1. Show me the element to click (provide CSS selector)")
        print("2. Take over and demonstrate the navigation")
        print("3. Provide CSS selector manually")
        print("4. Skip this site")

        while True:
            try:
                choice = await asyncio.get_event_loop().run_in_executor(
                    None, input, "Enter choice (1-4): "
                )
                choice = choice.strip()

                if choice == '1':
                    return await self.element_guidance(url)
                elif choice == '2':
                    return await self.human_demonstration(url)
                elif choice == '3':
                    return await self.selector_input()
                elif choice == '4':
                    return {'action': 'skip'}
                else:
                    print("❌ Invalid choice. Please enter 1-4.")
            except KeyboardInterrupt:
                return {'action': 'skip'}

    async def element_guidance(self, url: str) -> Dict[str, Any]:
        """Human points out which element to click"""
        print("🔍 Please inspect the page and provide:")
        print(" - CSS selector (e.g., 'button.apply-btn', '#apply-button')")
        print(" - OR text content (e.g., 'Apply Now')")
        print(" - OR description of the element")

        while True:
            try:
                guidance = await asyncio.get_event_loop().run_in_executor(
                    None, input, "Element identifier: "
                )
                guidance = guidance.strip()

                if guidance:
                    return {
                        'action': 'use_selector',
                        'selector': guidance,
                        'source': 'human_guidance'
                    }
                else:
                    print("❌ Please provide a valid selector or description.")
            except KeyboardInterrupt:
                return {'action': 'skip'}

    async def human_demonstration(self, url: str) -> Dict[str, Any]:
        """Human demonstrates the complete flow"""
        if not self.trainer:
            print("❌ Trainer not available")
            return {'action': 'skip'}

        print("🎬 Starting human demonstration...")
        learned_path = await self.trainer.start_training_session(url)

        if learned_path:
            return {
                'action': 'learned_from_demo',
                'learned_path': learned_path,
                'source': 'human_demonstration'
            }
        else:
            return {'action': 'skip'}

    async def selector_input(self) -> Dict[str, Any]:
        """Manual selector input"""
        print("🔧 Please provide a CSS selector:")

        while True:
            try:
                selector = await asyncio.get_event_loop().run_in_executor(
                    None, input, "CSS selector: "
                )
                selector = selector.strip()

                if selector:
                    return {
                        'action': 'use_selector',
                        'selector': selector,
                        'source': 'manual_input'
                    }
                else:
                    print("❌ Please provide a valid CSS selector.")
            except KeyboardInterrupt:
                return {'action': 'skip'}


class LearningEnhancedRentalDataAgent:
    """Enhanced RentalDataAgent with learning capabilities"""

    def __init__(self, *args, **kwargs):
        # Import here to avoid circular imports
        from rental_data_agent import RentalDataAgent
        self.base_agent = RentalDataAgent(*args, **kwargs)

        # Initialize learning components
        self.template_manager = self.base_agent.template_manager
        self.trainer = InteractiveTrainer(self.template_manager)
        self.feedback_system = HumanFeedbackSystem()
        self.feedback_system.set_trainer(self.trainer)

        # Load existing learned paths
        self.trainer.playback_learner.load_learned_paths()

    async def extract_rental_data_with_learning(self, url: str, enable_learning: bool = True) -> List[Dict[str, Any]]:
        """Enhanced extraction that can learn from failures"""
        try:
            # First attempt with existing templates and universal flow
            data = await self.base_agent.extract_rental_data(url)
            if data:
                return data

            if not enable_learning:
                return []

            # If failed, request human help
            print("🆘 Automatic extraction failed, requesting human guidance...")
            guidance = await self.feedback_system.request_human_guidance(
                url,
                'extraction_failed',
                self.get_failed_selectors()
            )

            if guidance['action'] == 'use_selector':
                # Retry with human-provided selector
                data = await self.retry_with_guidance(url, guidance['selector'])
            elif guidance['action'] == 'learned_from_demo':
                # Human demonstrated, now retry
                data = await self.base_agent.extract_rental_data(url)

            return data or []

        except Exception as e:
            print(f"❌ Enhanced extraction failed: {e}")
            return []

    async def start_learning_session(self, url: str) -> Optional[LearnedPath]:
        """Start an interactive learning session"""
        return await self.trainer.start_training_session(url)

    async def retry_with_guidance(self, url: str, selector: str) -> List[Dict[str, Any]]:
        """Retry extraction with a human-provided selector"""
        try:
            print(f"🔄 Retrying with selector: {selector}")

            # Navigate to the page
            await self.base_agent.page.goto(url)
            await self.base_agent.handle_cookie_consent()

            # Try to click the provided selector
            try:
                await self.base_agent.page.click(selector, timeout=10000)
                await asyncio.sleep(2)

                # Try to extract data from the new page
                data = await self.base_agent.extract_rental_data_universal()
                if data:
                    print("✅ Human guidance successful!")
                    return data
            except Exception as e:
                print(f"❌ Selector failed: {e}")

            return []

        except Exception as e:
            print(f"❌ Retry with guidance failed: {e}")
            return []

    def get_failed_selectors(self) -> List[str]:
        """Get list of selectors that failed during extraction"""
        # This would need to be implemented to track failed selectors
        # For now, return some common ones
        return [
            "a:has-text('Floor Plans')",
            "a[href*='floorplans']",
            ".floorplan-link",
            "a:has-text('Availability')",
            ".apply-btn"
        ]

    # Delegate other methods to base agent
    def __getattr__(self, name):
        return getattr(self.base_agent, name)


# Standalone functions for easy use
async def start_learning_session(url: str) -> Optional[LearnedPath]:
    """Start a learning session for a URL"""
    from rental_data_agent import RentalDataAgent

    base_agent = RentalDataAgent()
    trainer = InteractiveTrainer(base_agent.template_manager)
    return await trainer.start_training_session(url)


async def extract_with_learning(url: str, enable_learning: bool = True) -> List[Dict[str, Any]]:
    """Extract rental data with learning capabilities"""
    agent = LearningEnhancedRentalDataAgent()
    return await agent.extract_rental_data_with_learning(url, enable_learning)


if __name__ == "__main__":
    # Example usage
    import sys

    if len(sys.argv) < 2:
        print("Usage: python learning_system.py <url> [learn|extract]")
        sys.exit(1)

    url = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else "learn"

    if mode == "learn":
        print(f"🎬 Starting learning session for {url}")
        asyncio.run(start_learning_session(url))
    elif mode == "extract":
        print(f"🤖 Extracting with learning for {url}")
        result = asyncio.run(extract_with_learning(url))
        print(f"📊 Result: {len(result)} units found")
    else:
        print("❌ Invalid mode. Use 'learn' or 'extract'")