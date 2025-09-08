# apps/products/ai_utils.py

import google.generativeai as genai
from django.conf import settings

# Configure the library with your API key
genai.configure(api_key=settings.GEMINI_API_KEY)

def moderate_review_text(text: str) -> str:

    # Uses the Gemini API to classify review text.

    # Returns one of: 'APPROVED', 'REJECTED'

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = f"""
        You are a content moderation AI for an e-commerce platform. Your task is to classify a user-submitted review.
        The review text is enclosed in triple backticks below.

        Review Text:
        ```
        {text}
        ```

        Analyze the text for any of the following violations:
        - Profanity or hate speech
        - Spam or advertising
        - Personal contact information (emails, phone numbers)
        - Off-topic or irrelevant content
        - Threats or harassment

        Based on your analysis, respond with ONLY a single word in your output:
        - "APPROVED" if the text is safe and relevant.
        - "REJECTED" if the text violates any of the rules.
        """

        response = model.generate_content(prompt)
        
        # Clean up the response to get a single word
        classification = response.text.strip().upper()

        if classification in ['APPROVED', 'REJECTED']:
            return classification
        else:
            # If the AI gives an unexpected response, default to pending for manual review
            return 'PENDING'

    except Exception as e:
        # If the API call fails for any reason, default to pending
        print(f"Error during AI moderation: {e}")
        return 'PENDING'