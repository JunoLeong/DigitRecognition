import numpy as np
from PIL import Image
import os

#npz file path for MNIST dataset
mnist_npz_path = 'mnist.npz'

#Define the output directory for images
output_dir = 'mnist_images'

train_dir = os.path.join(output_dir, 'train')
test_dir = os.path.join(output_dir, 'test')

def save_images_from_data(images_data, labels_data, base_output_path):
    # ensure every digit have own folder
    for i in range(10):
        os.makedirs(os.path.join(base_output_path, str(i)), exist_ok=True)

    print(f"Save image to: {base_output_path}...")
    for i, (image_array, label) in enumerate(zip(images_data, labels_data)):
        # convert Numpy array to PIL Image
        # Since MNIST images are grayscale, we use mode 'L'
        img = Image.fromarray(image_array, mode='L') # 'L' mode for grayscale images

        # save image to corresponding label directory
        label_dir = os.path.join(base_output_path, str(label))
        image_path = os.path.join(label_dir, f'mnist_{i:05d}.png')

        # save the image
        img.save(image_path)

        if (i + 1) % 1000 == 0:
            print(f"Saved{i + 1} image to {base_output_path}")

    print(f"Save all to {base_output_path}")


if __name__ == "__main__":
    try:
        with np.load(mnist_npz_path) as data:
            x_train = data['x_train']
            y_train = data['y_train'] 
            x_test = data['x_test']   
            y_test = data['y_test']   

        print("Load MNIST dataset successfully!")
        print(f"train image number: {len(x_train)}")
        print(f"test image number: {len(x_test)}")

        save_images_from_data(x_train, y_train, train_dir)

        save_images_from_data(x_test, y_test, test_dir)

        print("\nConvert all images successfully!")

    except FileNotFoundError:
        print(f"Error: can't find '{mnist_npz_path}'")
    except Exception as e:
        print(f"Exception: {e}")