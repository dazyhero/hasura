import { config } from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';

config({ path: '.env' });

const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID;

if (!IMGUR_CLIENT_ID) {
  throw new Error('IMGUR_CLIENT_ID environment variable is not set');
}

export async function uploadImageToImgur(imageBuffer: Buffer): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('image', imageBuffer);

    const response = await axios.post('https://api.imgur.com/3/image', formData, {
      headers: {
        Authorization: `Client-ID ${IMGUR_CLIENT_ID}`,
        ...formData.getHeaders(),
      },
    });

    if (response.data.success) {
      return response.data.data.link;
    } else {
      throw new Error('Failed to upload image to Imgur');
    }
  } catch (error) {
    console.error('Imgur upload error:', error);
    throw new Error('Failed to upload image to Imgur');
  }
}
