#!/usr/bin/env python3
"""
Huntley AI Training Analysis
Analyzing what we learned from Huntley-specific video training
"""

import json
import os
from pathlib import Path


class HuntleyTrainingAnalysis:
    """Analyze Huntley-specific AI training results"""

    def __init__(self):
        self.agents_dir = Path(__file__).parent

    def analyze_huntley_training(self):
        """Comprehensive analysis of Huntley training results"""
        print("🏢 HUNTLEY AI TRAINING ANALYSIS")
        print("=" * 50)
        print("Analyzing video-based training results for The Huntley")
        print("=" * 50)

        # Find all Huntley-related files
        huntley_files = {
            "video_analyses": list(self.agents_dir.glob("video_analysis_*.json")),
            "hybrid_scraping": list(self.agents_dir.glob("hybrid_scraping_*.json")),
            "specialized_scraping": list(self.agents_dir.glob("huntley_specialized_scraping_*.json")),
            "combined_analyses": list(self.agents_dir.glob("combined_huntley_analysis_*.json"))
        }

        # Filter for Huntley-specific files (containing "huntley" or target URL)
        huntley_video_analyses = []
        huntley_scraping_results = []

        for file_path in huntley_files["video_analyses"]:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if "thehuntley.com" in str(data.get("target_url", "")).lower():
                        huntley_video_analyses.append((file_path, data))
            except:
                continue

        for file_path in huntley_files["hybrid_scraping"] + huntley_files["specialized_scraping"]:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    hybrid_info = data.get("hybrid_scraping", {})
                    if "thehuntley.com" in hybrid_info.get("target_url", "").lower():
                        huntley_scraping_results.append((file_path, data))
            except:
                continue

        print(f"📊 Found {len(huntley_video_analyses)} Huntley video analyses")
        print(f"📊 Found {len(huntley_scraping_results)} Huntley scraping results")
        print()

        # Analyze video learning
        self._analyze_video_learning(huntley_video_analyses)

        # Analyze scraping effectiveness
        self._analyze_scraping_effectiveness(huntley_scraping_results)

        # Compare with baseline (non-video scraping)
        self._compare_with_baseline()

        # Generate recommendations
        self._generate_recommendations()

    def _analyze_video_learning(self, video_analyses):
        """Analyze what the AI learned from Huntley videos"""
        print("🎥 VIDEO LEARNING ANALYSIS:")
        print("-" * 30)

        total_transitions = 0
        total_content_changes = 0
        pricing_pages_detected = 0

        for file_path, analysis in video_analyses:
            nav_patterns = analysis.get("navigation_patterns", {})
            transitions = len(nav_patterns.get("page_transitions", []))
            content_changes = len(nav_patterns.get("content_changes", []))
            pricing_detected = analysis.get("rental_data_patterns", {}).get("pricing_page_identified", False)

            total_transitions += transitions
            total_content_changes += content_changes
            if pricing_detected:
                pricing_pages_detected += 1

            print(f"   {file_path.name}:")
            print(f"     Transitions: {transitions}")
            print(f"     Content Changes: {content_changes}")
            print(f"     Pricing Page: {'✅ Detected' if pricing_detected else '❌ Not detected'}")

        print(f"\n   📈 TOTALS:")
        print(f"     Total Transitions Learned: {total_transitions}")
        print(f"     Total Content Changes: {total_content_changes}")
        print(f"     Videos with Pricing Detection: {pricing_pages_detected}/{len(video_analyses)}")
        print()

    def _analyze_scraping_effectiveness(self, scraping_results):
        """Analyze how effective the video-trained scraping was"""
        print("🔍 SCRAPING EFFECTIVENESS ANALYSIS:")
        print("-" * 40)

        video_based_results = []
        non_video_results = []

        for file_path, result in scraping_results:
            hybrid_info = result.get("hybrid_scraping", {})
            video_used = hybrid_info.get("video_patterns_used", False)
            rental_data = result.get("rental_data", {})
            prices_found = len(rental_data.get("prices", []))
            units_found = len(rental_data.get("units", []))

            result_info = {
                "file": file_path.name,
                "video_used": video_used,
                "prices": prices_found,
                "units": units_found,
                "method": hybrid_info.get("extraction_method", "unknown")
            }

            if video_used:
                video_based_results.append(result_info)
            else:
                non_video_results.append(result_info)

        print("   🎬 VIDEO-BASED SCRAPING:")
        if video_based_results:
            for result in video_based_results:
                print(f"     {result['file']}: {result['prices']} prices, {result['units']} units")
                print(f"       Method: {result['method']}")
        else:
            print("     No video-based results found")

        print("\n   🎯 NON-VIDEO SCRAPING (BASELINE):")
        if non_video_results:
            for result in non_video_results:
                print(f"     {result['file']}: {result['prices']} prices, {result['units']} units")
                print(f"       Method: {result['method']}")
        else:
            print("     No baseline results found")

        # Calculate effectiveness
        if video_based_results and non_video_results:
            avg_video_prices = sum(r['prices'] for r in video_based_results) / len(video_based_results)
            avg_baseline_prices = sum(r['prices'] for r in non_video_results) / len(non_video_results)
            avg_video_units = sum(r['units'] for r in video_based_results) / len(video_based_results)
            avg_baseline_units = sum(r['units'] for r in non_video_results) / len(non_video_results)

            print(f"\n   📊 COMPARISON:")
            print(f"     Video-based: {avg_video_prices:.1f} avg prices, {avg_video_units:.1f} avg units")
            print(f"     Baseline: {avg_baseline_prices:.1f} avg prices, {avg_baseline_units:.1f} avg units")
            print(f"     Effectiveness: {((avg_video_prices + avg_video_units) / (avg_baseline_prices + avg_baseline_units) * 100):.1f}% of baseline")

        print()

    def _compare_with_baseline(self):
        """Compare Huntley results with other websites"""
        print("🏢 CROSS-WEBSITE COMPARISON:")
        print("-" * 30)

        # Look for other website results
        all_scraping_files = list(self.agents_dir.glob("hybrid_scraping_*.json"))

        website_stats = {}
        for file_path in all_scraping_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    hybrid_info = data.get("hybrid_scraping", {})
                    target_url = hybrid_info.get("target_url", "")

                    if target_url:
                        rental_data = data.get("rental_data", {})
                        prices = len(rental_data.get("prices", []))
                        units = len(rental_data.get("units", []))

                        # Extract website name
                        if "highlandsatsweetwatercreek.com" in target_url:
                            site_name = "Highlands at Sweetwater Creek"
                        elif "boulevardatgrantpark.com" in target_url:
                            site_name = "Boulevard at Grant Park"
                        elif "thehuntley.com" in target_url:
                            site_name = "The Huntley"
                        else:
                            continue

                        if site_name not in website_stats:
                            website_stats[site_name] = []
                        website_stats[site_name].append((prices, units))

            except:
                continue

        for site_name, results in website_stats.items():
            if results:
                avg_prices = sum(p for p, u in results) / len(results)
                avg_units = sum(u for p, u in results) / len(results)
                print(f"   {site_name}: {avg_prices:.1f} avg prices, {avg_units:.1f} avg units")

        print()

    def _generate_recommendations(self):
        """Generate recommendations based on analysis"""
        print("🎯 RECOMMENDATIONS FOR HUNTLEY TRAINING:")
        print("-" * 45)

        recommendations = [
            "📹 Video Quality: The Huntley videos detected pricing pages but extraction was poor",
            "🎯 Navigation Focus: Videos should show complete navigation to pricing/floor plan pages",
            "🔄 Pattern Refinement: Consider additional video demonstrations with different navigation paths",
            "🎨 Website Specific: The Huntley may have unique pricing display patterns requiring specialized selectors",
            "📊 Success Comparison: Huntley performance (0-1 units) vs Highlands (30+ units) suggests different structures",
            "🔧 Enhancement Needed: May require custom extraction patterns for The Huntley's pricing layout",
            "📈 Training Strategy: Combine Huntley videos with successful patterns from other websites"
        ]

        for rec in recommendations:
            print(f"   • {rec}")

        print("\n🚀 NEXT STEPS:")
        print("   1. Record new Huntley videos showing complete pricing page navigation")
        print("   2. Test with different Chrome profiles or browser configurations")
        print("   3. Develop Huntley-specific CSS selectors and extraction patterns")
        print("   4. Compare Huntley's HTML structure with successfully scraped websites")
        print("   5. Consider manual inspection of Huntley's pricing page elements")


def main():
    """Run Huntley training analysis"""
    analyzer = HuntleyTrainingAnalysis()
    analyzer.analyze_huntley_training()


if __name__ == "__main__":
    main()