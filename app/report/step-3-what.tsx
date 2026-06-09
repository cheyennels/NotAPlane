import ReportStepShell from "@/components/report/ReportStepShell";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useReport } from "../../context/ReportContext";

const SHAPES = ["Sphere / Orb", "Cigar", "Disc", "Triangle", "Unknown / Other"];
const SOUNDS = ["Silent", "Humming", "Buzzing", "Loud", "Other"];
const COLORS = [
  { label: "Red", value: "red", hex: "#FF4545" },
  { label: "Orange", value: "orange", hex: "#FF8C00" },
  { label: "Yellow", value: "yellow", hex: "#FFE033" },
  { label: "Green", value: "green", hex: "#39FF14" },
  { label: "Blue", value: "blue", hex: "#00CFFF" },
  { label: "White", value: "white", hex: "#F2F2F0" },
];

export default function StepThreeWhat() {
  const { form, updateForm } = useReport();
  const [description, setDescription] = useState(form.description);
  const [selectedShape, setSelectedShape] = useState(form.shape);
  const [selectedSounds, setSelectedSounds] = useState<string[]>(
    form.sound ? form.sound.split(", ") : [],
  );
  const [selectedColors, setSelectedColors] = useState<string[]>(form.colors);
  const [photos, setPhotos] = useState<string[]>(form.photoUris);

  function handleContinue() {
    updateForm({
      description,
      shape: selectedShape,
      sound: selectedSounds.join(", "),
      colors: selectedColors,
      photoUris: photos,
    });
    router.push("/report/step-4-details" as any);
  }

  function toggleColor(value: string) {
    setSelectedColors((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  }

  function toggleSound(value: string) {
    setSelectedSounds((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...uris]);
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  return (
    <ReportStepShell
      step={3}
      stepHeading="What did you see?"
      footer={
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.replace("/(tabs)/map" as any)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.label}>DESCRIPTION OF EVENT</Text>
      <TextInput
        style={styles.textArea}
        placeholder="description of event (280 chars)"
        placeholderTextColor={Colors.muted}
        value={description}
        onChangeText={(t) => setDescription(t.slice(0, 280))}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{description.length}/280</Text>

      {/* Shape */}
      <Text style={styles.label}>SHAPE</Text>
      <View style={styles.pillGrid}>
        {SHAPES.map((shape) => (
          <TouchableOpacity
            key={shape}
            style={[styles.pill, selectedShape === shape && styles.pillActive]}
            onPress={() => setSelectedShape(shape)}
          >
            <Text
              style={[
                styles.pillText,
                selectedShape === shape && styles.pillTextActive,
              ]}
            >
              {shape}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sound */}
      <Text style={styles.label}>SOUND</Text>
      <View style={styles.pillGrid}>
        {SOUNDS.map((sound) => (
          <TouchableOpacity
            key={sound}
            style={[
              styles.pill,
              selectedSounds.includes(sound) && styles.pillActive,
            ]}
            onPress={() => toggleSound(sound)}
          >
            <Text
              style={[
                styles.pillText,
                selectedSounds.includes(sound) && styles.pillTextActive,
              ]}
            >
              {sound}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Color */}
      <Text style={styles.label}>COLOR</Text>
      <View style={styles.colorRow}>
        {COLORS.map((color) => (
          <TouchableOpacity
            key={color.value}
            style={[
              styles.colorSwatch,
              { backgroundColor: color.hex },
              selectedColors.includes(color.value) && styles.colorSwatchActive,
            ]}
            onPress={() => toggleColor(color.value)}
          />
        ))}
      </View>

      {/* Photo */}
      <Text style={styles.label}>PHOTO</Text>
      <View style={styles.photoRow}>
        <TouchableOpacity style={styles.photoAdd} onPress={pickImage}>
          <Text style={styles.photoAddText}>+</Text>
        </TouchableOpacity>
        {photos.map((uri) => (
          <View key={uri} style={styles.photoThumb}>
            <Image source={{ uri }} style={styles.photoImage} />
            <TouchableOpacity
              style={styles.photoRemove}
              onPress={() => removePhoto(uri)}
            >
              <Text style={styles.photoRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ReportStepShell>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.green,
    letterSpacing: 2,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: Colors.surface2,
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 14,
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.white,
    minHeight: 100,
    marginBottom: 4,
  },
  charCount: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.muted,
    textAlign: "right",
    marginBottom: 20,
  },
  pillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  pill: {
    borderWidth: 2,
    borderColor: Colors.white,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillActive: {
    borderColor: Colors.green,
    backgroundColor: "rgba(57,255,20,0.07)",
  },
  pillText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    color: Colors.muted,
  },
  pillTextActive: {
    color: Colors.green,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorSwatchActive: {
    borderColor: Colors.white,
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  photoAddText: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.white,
  },
  photoThumb: {
    width: 80,
    height: 80,
    position: "relative",
  },
  photoImage: {
    width: 80,
    height: 80,
  },
  photoRemove: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    backgroundColor: Colors.red,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: {
    fontFamily: Fonts.mono,
    fontSize: 9,
    color: Colors.white,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    gap: 10,
    backgroundColor: Colors.black,
  },
  continueBtn: {
    backgroundColor: Colors.green,
    padding: 16,
    alignItems: "center",
  },
  continueBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.black,
    letterSpacing: 1,
  },
  cancelBtn: {
    borderWidth: 2,
    borderColor: Colors.white,
    padding: 16,
    alignItems: "center",
  },
  cancelBtnText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: 1,
  },
});
