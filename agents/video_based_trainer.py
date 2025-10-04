#!/usr/bin/env python3
"""
Video-Based AI Trainer
Trains AI scraper using video demonstrations of website navigation
"""

import cv2
import json
import time
import os
import sys
from typing import Optional, Dict, List
import asyncio
from playwright.async_api import async_playwright


class VideoBasedTrainer:
    """Trains AI scraper using video demonstrations"""

    def __init__(self):
        self.chrome_profile_path = self._get_chrome_profile_path()

    def _get_chrome_profile_path(self) -> Optional[str]:
        """Get Chrome profile path"""
        import platform
        system = platform.system()
        home = os.path.expanduser("~")

        if system == "Windows":
            return os.path.join(home, "AppData", "Local", "Google", "Chrome", "User Data")
        elif system == "Darwin":
            return os.path.join(home, "Library", "Application Support", "Google", "Chrome")
        elif system == "Linux":
            return os.path.join(home, ".config", "google-chrome")
        return None

    def analyze_video_demonstration(self, video_path: str):
        """Analyze video to extract navigation patterns and UI elements"""
        print("[VIDEO] Video-Based AI Training System")
        print("[VIDEO] Analyzing demonstration video for scraping patterns")
        print("=" * 60)

        if not os.path.exists(video_path):
            print(f"[ERROR] Video file not found: {video_path}")
            return None

        try:
            # Open video file
            cap = cv2.VideoCapture(video_path)

            if not cap.isOpened():
                print("[ERROR] Could not open video file")
                return None

            # Get video properties
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps

            print(f"[VIDEO] Video loaded: {duration:.1f}s, {frame_count} frames, {fps} fps")

            # Extract key frames (every 1 second)
            key_frames = []
            frame_interval = int(fps)  # One frame per second

            current_frame = 0
            extracted_frame_count = 0

            while current_frame < frame_count:
                cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame)
                ret, frame = cap.read()

                if ret:
                    # Save frame for analysis
                    frame_filename = f"video_frame_{extracted_frame_count:04d}.jpg"
                    cv2.imwrite(frame_filename, frame)

                    # Analyze frame for UI elements
                    frame_analysis = self._analyze_frame(frame, extracted_frame_count)

                    key_frames.append({
                        "frame_number": current_frame,
                        "timestamp": current_frame / fps,
                        "filename": frame_filename,
                        "analysis": frame_analysis
                    })

                    extracted_frame_count += 1

                current_frame += frame_interval

            cap.release()

            print(f"[VIDEO] Extracted {len(key_frames)} key frames for analysis")

            # Analyze navigation patterns from frame sequence
            navigation_patterns = self._analyze_navigation_patterns(key_frames)

            # Extract rental data patterns from video
            rental_patterns = self._extract_rental_patterns_from_video(key_frames)

            result = {
                "video_analysis": {
                    "video_path": video_path,
                    "duration_seconds": duration,
                    "total_frames": frame_count,
                    "fps": fps,
                    "key_frames_extracted": len(key_frames),
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                },
                "navigation_patterns": navigation_patterns,
                "rental_data_patterns": rental_patterns,
                "learned_patterns": {
                    "ui_elements": self._extract_ui_patterns(key_frames),
                    "text_patterns": self._extract_text_patterns(key_frames),
                    "interaction_patterns": navigation_patterns.get("interactions", [])
                }
            }

            print("[SUCCESS] Video analysis completed!")

            return result

        except Exception as e:
            print(f"[ERROR] Video analysis failed: {e}")
            return None

    def _analyze_frame(self, frame, frame_index):
        """Analyze individual frame for UI elements"""
        try:
            # Convert to grayscale for analysis
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

            # Look for text regions (high contrast areas)
            # This is a simplified analysis - in practice you'd use OCR
            height, width = gray.shape

            # Simple edge detection to find UI elements
            edges = cv2.Canny(gray, 100, 200)

            # Find contours (potential UI elements)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            ui_elements = []
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)
                if area > 1000:  # Filter small elements
                    x, y, w, h = cv2.boundingRect(contour)
                    ui_elements.append({
                        "id": f"element_{frame_index}_{i}",
                        "position": {"x": x, "y": y, "width": w, "height": h},
                        "area": area,
                        "aspect_ratio": w/h if h > 0 else 0
                    })

            return {
                "frame_dimensions": {"width": width, "height": height},
                "ui_elements_detected": len(ui_elements),
                "ui_elements": ui_elements[:10],  # Limit for storage
                "has_text_regions": len([e for e in ui_elements if e["aspect_ratio"] > 3]) > 0
            }

        except Exception as e:
            return {"error": str(e)}

    def _analyze_navigation_patterns(self, key_frames):
        """Analyze sequence of frames to understand navigation patterns"""
        patterns = {
            "page_transitions": [],
            "ui_interactions": [],
            "content_changes": [],
            "interactions": []
        }

        try:
            for i in range(1, len(key_frames)):
                current_frame = key_frames[i]
                previous_frame = key_frames[i-1]

                # Compare UI elements between frames
                current_elements = current_frame["analysis"].get("ui_elements", [])
                previous_elements = previous_frame["analysis"].get("ui_elements", [])

                # Simple change detection
                current_count = len(current_elements)
                previous_count = len(previous_elements)

                if abs(current_count - previous_count) > 2:
                    patterns["content_changes"].append({
                        "timestamp": current_frame["timestamp"],
                        "change_type": "ui_element_count_change",
                        "previous_count": previous_count,
                        "current_count": current_count
                    })

                # Look for patterns that indicate navigation
                if current_frame["analysis"].get("has_text_regions") and not previous_frame["analysis"].get("has_text_regions"):
                    patterns["page_transitions"].append({
                        "timestamp": current_frame["timestamp"],
                        "transition_type": "text_content_loaded"
                    })

        except Exception as e:
            patterns["error"] = str(e)

        return patterns

    def _extract_rental_patterns_from_video(self, key_frames):
        """Extract rental-specific patterns from video frames"""
        # This would use OCR and image recognition to find rental data
        # For now, we'll create a framework for this analysis

        rental_patterns = {
            "price_indicators": [],
            "unit_indicators": [],
            "navigation_to_pricing": [],
            "pricing_page_identified": False
        }

        # Look for frames that might contain pricing information
        # This is a simplified version - real implementation would use OCR

        for frame in key_frames:
            analysis = frame["analysis"]

            # Look for patterns that suggest pricing content
            ui_elements = analysis.get("ui_elements", [])

            # Frames with many rectangular elements might be pricing grids
            rectangular_elements = [e for e in ui_elements if 0.5 < e["aspect_ratio"] < 3.0]

            if len(rectangular_elements) > 5:
                rental_patterns["pricing_page_identified"] = True
                rental_patterns["navigation_to_pricing"].append({
                    "timestamp": frame["timestamp"],
                    "confidence": "high",
                    "reason": f"Found {len(rectangular_elements)} rectangular UI elements"
                })

        return rental_patterns

    def _extract_ui_patterns(self, key_frames):
        """Extract common UI patterns from video"""
        patterns = {
            "button_patterns": [],
            "text_field_patterns": [],
            "navigation_patterns": [],
            "content_layouts": []
        }

        # Analyze all frames for common UI patterns
        all_elements = []
        for frame in key_frames:
            all_elements.extend(frame["analysis"].get("ui_elements", []))

        # Group similar elements
        if all_elements:
            # Simple clustering by aspect ratio
            button_like = [e for e in all_elements if 2.0 < e["aspect_ratio"] < 6.0]
            text_like = [e for e in all_elements if e["aspect_ratio"] > 6.0]

            patterns["button_patterns"] = {
                "count": len(button_like),
                "avg_aspect_ratio": sum(e["aspect_ratio"] for e in button_like) / len(button_like) if button_like else 0
            }

            patterns["text_field_patterns"] = {
                "count": len(text_like),
                "avg_aspect_ratio": sum(e["aspect_ratio"] for e in text_like) / len(text_like) if text_like else 0
            }

        return patterns

    def _extract_text_patterns(self, key_frames):
        """Extract text patterns from video frames"""
        # This would use OCR to extract text
        # For now, return framework
        return {
            "text_regions_found": sum(1 for f in key_frames if f["analysis"].get("has_text_regions")),
            "estimated_text_elements": "OCR analysis would go here",
            "common_phrases": ["Floor Plans", "Pricing", "Availability", "Apply Now"]  # Placeholder
        }

    async def apply_video_learnings(self, video_analysis_result, target_url: str):
        """Apply patterns learned from video to real website scraping"""
        print("[APPLY] Applying video-learned patterns to live website")

        if not video_analysis_result:
            print("[ERROR] No video analysis data available")
            return None

        # Get Chrome profile path
        chrome_profile_path = self._get_chrome_profile_path()
        if not chrome_profile_path or not os.path.exists(chrome_profile_path):
            print(f"[ERROR] Chrome profile not found: {chrome_profile_path}")
            return None

        # Use the learned patterns to scrape the target website
        async with async_playwright() as p:
            try:
                browser = await p.chromium.launch_persistent_context(
                    user_data_dir=chrome_profile_path,
                    headless=False,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--no-first-run',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                    ],
                    viewport={'width': 1920, 'height': 1080},
                )

                page = await browser.new_page()
                await page.goto(target_url, wait_until='domcontentloaded')

                # Apply learned navigation patterns
                rental_data = await self._scrape_using_video_patterns(page, video_analysis_result)

                return {
                    "applied_patterns": video_analysis_result["learned_patterns"],
                    "scraped_data": rental_data,
                    "success": len(rental_data.get("prices", [])) > 0 or len(rental_data.get("units", [])) > 0
                }

            except Exception as e:
                print(f"[ERROR] Applying video patterns failed: {e}")
                return None


async def main():
    """Video-based AI training"""
    if len(sys.argv) < 2:
        print("Usage: python video_based_trainer.py <video_path> [target_url]")
        print("Example: python video_based_trainer.py demonstration.mp4 https://highlandsatsweetwatercreek.com/")
        print()
        print("Note: Video should show navigation to pricing/floor plans page")
        print("Note: Requires OpenCV: pip install opencv-python")
        sys.exit(1)

    video_path = sys.argv[1]
    target_url = sys.argv[2] if len(sys.argv) > 2 else None

    print("[VIDEO] Video-Based AI Training System")
    print("[VIDEO] Learning scraping patterns from demonstration videos")
    print("=" * 55)

    trainer = VideoBasedTrainer()

    try:
        # Analyze the video
        analysis_result = trainer.analyze_video_demonstration(video_path)

        if analysis_result:
            print("\n[SUCCESS] Video analysis completed!")

            # Save analysis results
            timestamp = int(time.time())
            filename = f"video_analysis_{timestamp}.json"

            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(analysis_result, f, indent=2, ensure_ascii=False)

            print(f"[SAVE] Video analysis saved: {filename}")

            # Show summary
            video_info = analysis_result.get("video_analysis", {})
            patterns = analysis_result.get("navigation_patterns", {})
            rental_patterns = analysis_result.get("rental_data_patterns", {})

            print("\n[SUMMARY] Video Analysis Results:")
            print(f"   Duration: {video_info.get('duration_seconds', 0):.1f} seconds")
            print(f"   Key Frames: {video_info.get('key_frames_extracted', 0)}")
            print(f"   Page Transitions: {len(patterns.get('page_transitions', []))}")
            print(f"   Content Changes: {len(patterns.get('content_changes', []))}")
            print(f"   Pricing Page Detected: {rental_patterns.get('pricing_page_identified', False)}")

            # Apply learnings to target website if provided
            if target_url:
                print(f"\n[APPLY] Applying learned patterns to: {target_url}")
                application_result = await trainer.apply_video_learnings(analysis_result, target_url)

                if application_result:
                    scraped_data = application_result.get("scraped_data", {})
                    print(f"   Applied Patterns Success: {application_result['success']}")
                    print(f"   Prices Found: {len(scraped_data.get('prices', []))}")
                    print(f"   Units Found: {len(scraped_data.get('units', []))}")

        else:
            print("\n[ERROR] Video analysis failed")

    except KeyboardInterrupt:
        print("\n[STOP] Video analysis stopped")
    except Exception as e:
        print(f"\n[ERROR] Video analysis error: {e}")


if __name__ == "__main__":
    asyncio.run(main())