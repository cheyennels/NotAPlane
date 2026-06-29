import ReportStepShell from "@/components/report/ReportStepShell";
import BottomActionBar from "@/components/ui/BottomActionBar";
import Button from "@/components/ui/Button";
import PillGroup from "@/components/ui/PillGroup";
import SectionLabel from "@/components/ui/SectionLabel";
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
import { notify } from "@/lib/notify";
import { useReport } from "../../context/ReportContext";
import { cachePhotoAsset } from "../../lib/uploadPhoto";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // matches the storage bucket limit

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
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      notify("Photo limit", `You can attach up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (result.canceled) return;

    const accepted: string[] = [];
    let skippedTooLarge = false;
    for (const asset of result.assets.slice(0, remaining)) {
      if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
        skippedTooLarge = true;
        continue;
      }
      await cachePhotoAsset(asset.uri, asset.file as File | undefined);
      accepted.push(asset.uri);
    }

    if (accepted.length > 0) {
      setPhotos((prev) => [...prev, ...accepted]);
    }
    if (skippedTooLarge) {
      notify(
        "Photo too large",
        "Some photos exceed the 5 MB limit and were skipped.",
      );
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
        <BottomActionBar>
          <Button label="Continue" onPress={handleContinue} />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => router.replace("/(tabs)/map" as any)}
          />
        </BottomActionBar>
      }
    >
      <SectionLabel>Description of Event</SectionLabel>
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

      <SectionLabel>Shape</SectionLabel>
      <PillGroup
        options={SHAPES}
        selected={selectedShape}
        onSelect={setSelectedShape}
      />

      <SectionLabel>Sound</SectionLabel>
      <PillGroup
        options={SOUNDS}
        selected={selectedSounds}
        onSelect={toggleSound}
      />

      <SectionLabel>Color</SectionLabel>
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

      <SectionLabel>Photo</SectionLabel>
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
    boxShadow: `0 0 4px ${Colors.white}`,
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
});
