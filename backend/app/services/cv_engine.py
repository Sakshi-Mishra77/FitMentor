# backend/app/services/cv_engine.py
import os
import cv2
import numpy as np
import urllib.request
import logging
from typing import List

logger = logging.getLogger(__name__)

class ComputerVisionModule:
    def __init__(self):
        # Define URLs for the official OpenCV Haar Cascades
        base_url = "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/"
        cascades = {
            "face": "haarcascade_frontalface_default.xml",
            "eye": "haarcascade_eye.xml",
            "smile": "haarcascade_smile.xml"
        }
        
        self.cascade_paths = {}
        
        # Create a local cache directory inside the services folder
        data_dir = os.path.join(os.path.dirname(__file__), "cascade_data")
        os.makedirs(data_dir, exist_ok=True)

        # Auto-download the XML weights if they don't exist
        for key, filename in cascades.items():
            local_path = os.path.join(data_dir, filename)
            if not os.path.exists(local_path):
                logger.info(f"Downloading OpenCV weights: {filename}...")
                try:
                    urllib.request.urlretrieve(base_url + filename, local_path)
                except Exception as e:
                    logger.error(f"Failed to download {filename}: {e}")
            self.cascade_paths[key] = local_path

        # Load the cascades from our guaranteed local paths
        self.face_cascade = cv2.CascadeClassifier(self.cascade_paths.get("face", ""))
        self.eye_cascade = cv2.CascadeClassifier(self.cascade_paths.get("eye", ""))
        self.smile_cascade = cv2.CascadeClassifier(self.cascade_paths.get("smile", ""))

    def analyze_snapshots(self, image_blobs: List[bytes]) -> str:
        if not image_blobs:
            return "No video data provided."

        eye_contact_frames = 0
        smiling_frames = 0
        valid_frames = 0

        for img_bytes in image_blobs:
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                continue

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Detect Face
            faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(50, 50))

            if len(faces) == 0:
                continue

            valid_frames += 1
            (x, y, w, h) = faces[0] 
            roi_gray = gray[y:y+h, x:x+w]

            # Detect Eyes
            eyes = self.eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=10, minSize=(15, 15))
            if len(eyes) >= 2:
                eye_contact_frames += 1

            # Detect Smile 
            smiles = self.smile_cascade.detectMultiScale(roi_gray, scaleFactor=1.7, minNeighbors=22, minSize=(25, 25))
            if len(smiles) > 0:
                smiling_frames += 1

        if valid_frames == 0:
            return "Could not detect a clear face in the video stream."

        eye_contact_pct = (eye_contact_frames / valid_frames) * 100
        smile_pct = (smiling_frames / valid_frames) * 100

        confidence = "High" if eye_contact_pct > 60 else ("Moderate" if eye_contact_pct > 30 else "Low")
        expression = "positive/engaged" if smile_pct > 20 else "serious/neutral"

        return f"Confidence Level: {confidence} ({eye_contact_pct:.0f}% eye contact). Facial Expression: {expression}."

cv_module = ComputerVisionModule()