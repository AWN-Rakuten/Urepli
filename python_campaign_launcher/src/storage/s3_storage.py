import boto3
from botocore.exceptions import ClientError
import os
from typing import Optional
from ..core.config import settings


class S3Storage:
    """Handle file storage using S3-compatible storage"""
    
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key
        )
        self.bucket_name = settings.s3_bucket_name
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the S3 bucket exists, create if it doesn't"""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.client.create_bucket(Bucket=self.bucket_name)
                print(f"Created S3 bucket: {self.bucket_name}")
            except ClientError as e:
                print(f"Error creating bucket: {e}")
    
    def upload_file(self, local_file_path: str, s3_key: str) -> Optional[str]:
        """Upload a file to S3 and return the public URL"""
        try:
            self.client.upload_file(local_file_path, self.bucket_name, s3_key)
            
            # Generate public URL
            url = f"{settings.s3_endpoint_url}/{self.bucket_name}/{s3_key}"
            return url
            
        except Exception as e:
            print(f"Error uploading file to S3: {e}")
            return None
    
    def download_file(self, s3_key: str, local_file_path: str) -> bool:
        """Download a file from S3"""
        try:
            self.client.download_file(self.bucket_name, s3_key, local_file_path)
            return True
        except Exception as e:
            print(f"Error downloading file from S3: {e}")
            return False
    
    def delete_file(self, s3_key: str) -> bool:
        """Delete a file from S3"""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=s3_key)
            return True
        except Exception as e:
            print(f"Error deleting file from S3: {e}")
            return False
    
    def list_files(self, prefix: str = "") -> list:
        """List files in S3 with optional prefix"""
        try:
            response = self.client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'],
                    'url': f"{settings.s3_endpoint_url}/{self.bucket_name}/{obj['Key']}"
                })
            
            return files
            
        except Exception as e:
            print(f"Error listing files from S3: {e}")
            return []
    
    def get_file_url(self, s3_key: str) -> str:
        """Get the public URL for a file"""
        return f"{settings.s3_endpoint_url}/{self.bucket_name}/{s3_key}"
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """Generate a presigned URL for temporary access"""
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            print(f"Error generating presigned URL: {e}")
            return None