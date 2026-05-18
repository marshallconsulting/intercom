#!/usr/bin/env bash
#
# grab-frames.sh — Extract frames from a recording at a transcript timestamp.
#
# Usage:
#   ./grab-frames.sh <MM:SS> [options]
#   ./grab-frames.sh calibrate [options]
#   ./grab-frames.sh sync <transcript_MM:SS> <video_MM:SS> [options]
#   ./grab-frames.sh list
#
# Options:
#   -r, --recording <path_or_stem>   Select recording (path, filename, or stem)
#   --offset <seconds>               Manual offset override (bypasses sync map)
#   --window <seconds>               Window around timestamp (default: 5)
#   --count <n>                      Number of frames to extract (default: 5)
#   --transcript <path>              Path to transcript file
#
# If no recording is specified, uses the most recently modified .mov/.mp4 in recordings/.
#
# Sync maps are per-recording sidecar files: <video>.sync-map.txt
# Frames are saved to: recordings/frames/<video-stem>/<timestamp>/
#
# Examples:
#   ./grab-frames.sh 17:04                                # latest recording
#   ./grab-frames.sh 17:04 -r design-call-2026-03-10
#   ./grab-frames.sh calibrate -r some-other-call.mov
#   ./grab-frames.sh sync 02:34 02:00                     # add sync point
#   ./grab-frames.sh list                                  # show all recordings

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RECORDINGS_DIR="$REPO_ROOT/recordings"

# Defaults
OFFSET=""
WINDOW=5
COUNT=5
RECORDING=""
TRANSCRIPT=""

# Helper: parse MM:SS to seconds
parse_time() {
    local t="$1"
    local m="${t%%:*}"
    local s="${t##*:}"
    echo $(( 10#$m * 60 + 10#$s ))
}

# Helper: resolve recording path from path, filename, or stem
resolve_recording() {
    local input="$1"

    # Direct path
    if [[ -f "$input" ]]; then
        echo "$input"
        return
    fi

    # Try in recordings dir
    if [[ -f "$RECORDINGS_DIR/$input" ]]; then
        echo "$RECORDINGS_DIR/$input"
        return
    fi

    # Try as stem (no extension)
    for ext in mov mp4 mkv; do
        if [[ -f "$RECORDINGS_DIR/${input}.${ext}" ]]; then
            echo "$RECORDINGS_DIR/${input}.${ext}"
            return
        fi
    done

    # Glob match
    local matches
    matches=$(find "$RECORDINGS_DIR" -maxdepth 1 -name "*${input}*" -type f \( -name "*.mov" -o -name "*.mp4" -o -name "*.mkv" \) 2>/dev/null | head -1)
    if [[ -n "$matches" ]]; then
        echo "$matches"
        return
    fi

    echo ""
}

# Helper: find most recent recording
find_latest_recording() {
    local latest
    latest=$(find "$RECORDINGS_DIR" -maxdepth 1 -type f \( -name "*.mov" -o -name "*.mp4" -o -name "*.mkv" \) -print0 2>/dev/null | xargs -0 ls -t 2>/dev/null | head -1)
    echo "$latest"
}

# Helper: get sync map path for a video
sync_map_for() {
    local video="$1"
    local dir stem
    dir="$(dirname "$video")"
    stem="$(basename "$video")"
    stem="${stem%.*}"
    echo "${dir}/${stem}.sync-map.txt"
}

# Helper: get frames dir for a video
frames_dir_for() {
    local video="$1"
    local stem
    stem="$(basename "$video")"
    stem="${stem%.*}"
    echo "$RECORDINGS_DIR/frames/${stem}"
}

# Helper: find transcript for a recording
find_transcript() {
    local video="$1"
    local stem
    stem="$(basename "$video")"
    stem="${stem%.*}"

    # Check for transcript sidecar next to video
    local dir
    dir="$(dirname "$video")"
    for suffix in .transcript.txt .txt; do
        if [[ -f "${dir}/${stem}${suffix}" ]]; then
            echo "${dir}/${stem}${suffix}"
            return
        fi
    done

    # Check customers/ directories for matching transcript
    local match
    match=$(find "$REPO_ROOT/customers" -maxdepth 3 -name "*transcript*" -name "*${stem##*-}*" -type f 2>/dev/null | head -1)
    if [[ -n "$match" ]]; then
        echo "$match"
        return
    fi

    echo ""
}

# Parse args
COMMAND=""
SYNC_TRANS=""
SYNC_VIDEO=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -r|--recording)
            RECORDING="$2"
            shift 2
            ;;
        --offset)
            OFFSET="$2"
            shift 2
            ;;
        --window)
            WINDOW="$2"
            shift 2
            ;;
        --count)
            COUNT="$2"
            shift 2
            ;;
        --transcript)
            TRANSCRIPT="$2"
            shift 2
            ;;
        calibrate|list)
            COMMAND="$1"
            shift
            ;;
        sync)
            COMMAND="sync"
            if [[ $# -lt 3 ]]; then
                echo "Usage: grab-frames.sh sync <transcript_MM:SS> <video_MM:SS> [-r recording]" >&2
                exit 1
            fi
            SYNC_TRANS="$2"
            SYNC_VIDEO="$3"
            shift 3
            ;;
        -*)
            echo "Unknown flag: $1" >&2
            exit 1
            ;;
        *)
            if [[ -z "$COMMAND" ]]; then
                COMMAND="$1"
            fi
            shift
            ;;
    esac
done

if [[ -z "$COMMAND" ]]; then
    echo "Usage: grab-frames.sh <MM:SS> [-r recording] [--window N] [--count N]"
    echo "       grab-frames.sh calibrate [-r recording]"
    echo "       grab-frames.sh sync <transcript_MM:SS> <video_MM:SS> [-r recording]"
    echo "       grab-frames.sh list"
    exit 1
fi

# --- List command ---
if [[ "$COMMAND" == "list" ]]; then
    echo "Recordings in $RECORDINGS_DIR:"
    echo ""
    while IFS= read -r -d '' video; do
        stem="$(basename "$video")"
        size=$(du -h "$video" | cut -f1 | xargs)
        duration=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$video" 2>/dev/null | cut -d. -f1)
        if [[ -n "$duration" ]]; then
            mins=$((duration / 60))
            secs=$((duration % 60))
            dur_str="${mins}m${secs}s"
        else
            dur_str="?"
        fi
        sync_map=$(sync_map_for "$video")
        sync_count=0
        if [[ -f "$sync_map" ]]; then
            sync_count=$(grep -v '^#' "$sync_map" | grep -v '^$' | wc -l | xargs)
        fi
        echo "  $stem  ($size, $dur_str, $sync_count sync points)"
    done < <(find "$RECORDINGS_DIR" -maxdepth 1 -type f \( -name "*.mov" -o -name "*.mp4" -o -name "*.mkv" \) -print0 | xargs -0 ls -t 2>/dev/null | tr '\n' '\0')
    exit 0
fi

# --- Resolve recording ---
if [[ -n "$RECORDING" ]]; then
    VIDEO=$(resolve_recording "$RECORDING")
    if [[ -z "$VIDEO" ]]; then
        echo "Error: Recording not found: $RECORDING" >&2
        echo "Run 'grab-frames.sh list' to see available recordings." >&2
        exit 1
    fi
else
    VIDEO=$(find_latest_recording)
    if [[ -z "$VIDEO" ]]; then
        echo "Error: No recordings found in $RECORDINGS_DIR" >&2
        exit 1
    fi
fi

echo "Recording: $(basename "$VIDEO")"
SYNC_MAP=$(sync_map_for "$VIDEO")
FRAMES_BASE=$(frames_dir_for "$VIDEO")

# --- Sync command ---
if [[ "$COMMAND" == "sync" ]]; then
    # Create sync map with header if it doesn't exist
    if [[ ! -f "$SYNC_MAP" ]]; then
        cat > "$SYNC_MAP" << 'HEADER'
# Sync Map: transcript timestamp -> video timestamp
# Format: transcript_time video_time (both in MM:SS)
#
# Add sync points by finding a recognizable moment in both.
# Run "grab-frames.sh calibrate" to extract frames at known video times.
# Multiple sync points allow interpolation for drift.
#
# --- Sync points below this line ---
HEADER
    fi
    echo "$SYNC_TRANS $SYNC_VIDEO" >> "$SYNC_MAP"
    echo "Added sync point: transcript $SYNC_TRANS = video $SYNC_VIDEO"
    echo "Sync map: $SYNC_MAP"
    echo "Contents:"
    grep -v '^#' "$SYNC_MAP" | grep -v '^$'
    exit 0
fi

# --- Calibrate command ---
if [[ "$COMMAND" == "calibrate" ]]; then
    CAL_DIR="$FRAMES_BASE/calibrate"
    mkdir -p "$CAL_DIR"
    echo "Extracting calibration frames at 0:00, 1:00, 2:00, 3:00..."
    for t in 0 60 120 180; do
        min=$((t / 60))
        sec=$((t % 60))
        label=$(printf "%02d-%02d" $min $sec)
        ffmpeg -ss "$t" -i "$VIDEO" -frames:v 1 -update 1 -q:v 2 "$CAL_DIR/calibrate-${label}.png" -y -loglevel warning
        echo "  -> calibrate-${label}.png (video ${min}:$(printf '%02d' $sec))"
    done
    echo ""
    echo "Frames saved to: $CAL_DIR/"
    echo ""
    echo "Compare these frames to your transcript to find sync points."
    echo "Look for the Teams meeting timer or a recognizable moment."
    echo "Then run: grab-frames.sh sync <transcript_time> <video_time>"
    exit 0
fi

# --- Frame extraction ---

# Parse MM:SS
TIMESTAMP="$COMMAND"
if [[ "$TIMESTAMP" =~ ^([0-9]+):([0-9]{2})$ ]]; then
    MINUTES="${BASH_REMATCH[1]}"
    SECONDS_PART="${BASH_REMATCH[2]}"
    TOTAL_SECONDS=$(( MINUTES * 60 + SECONDS_PART ))
else
    echo "Error: Timestamp must be in MM:SS format (e.g., 17:04)" >&2
    exit 1
fi

# Determine video time from sync map or manual offset
if [[ -n "$OFFSET" ]]; then
    VIDEO_TIME=$(( TOTAL_SECONDS - OFFSET ))
    echo "Using manual offset: ${OFFSET}s"
elif [[ -f "$SYNC_MAP" ]]; then
    SYNC_POINTS=()
    while IFS= read -r line; do
        [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
        SYNC_POINTS+=("$line")
    done < "$SYNC_MAP"

    if [[ ${#SYNC_POINTS[@]} -eq 0 ]]; then
        echo "Warning: Sync map exists but has no points. Using offset=0."
        echo "Run: grab-frames.sh calibrate  (then add sync points)"
        VIDEO_TIME=$TOTAL_SECONDS
    elif [[ ${#SYNC_POINTS[@]} -eq 1 ]]; then
        read -r sp_trans sp_video <<< "${SYNC_POINTS[0]}"
        sp_trans_s=$(parse_time "$sp_trans")
        sp_video_s=$(parse_time "$sp_video")
        CALC_OFFSET=$(( sp_trans_s - sp_video_s ))
        VIDEO_TIME=$(( TOTAL_SECONDS - CALC_OFFSET ))
        echo "Sync: offset ${CALC_OFFSET}s (from $sp_trans=$sp_video)"
    else
        BEST_BEFORE=""
        BEST_AFTER=""
        BEST_BEFORE_DIST=999999
        BEST_AFTER_DIST=999999
        for sp in "${SYNC_POINTS[@]}"; do
            read -r sp_trans sp_video <<< "$sp"
            sp_trans_s=$(parse_time "$sp_trans")
            sp_video_s=$(parse_time "$sp_video")
            diff=$(( TOTAL_SECONDS - sp_trans_s ))
            if [[ $diff -ge 0 && $diff -lt $BEST_BEFORE_DIST ]]; then
                BEST_BEFORE_DIST=$diff
                BEST_BEFORE="$sp_trans_s $sp_video_s"
            fi
            if [[ $diff -lt 0 ]]; then
                adiff=$(( -diff ))
                if [[ $adiff -lt $BEST_AFTER_DIST ]]; then
                    BEST_AFTER_DIST=$adiff
                    BEST_AFTER="$sp_trans_s $sp_video_s"
                fi
            fi
        done

        if [[ -n "$BEST_BEFORE" && -n "$BEST_AFTER" ]]; then
            read -r bt_s bv_s <<< "$BEST_BEFORE"
            read -r at_s av_s <<< "$BEST_AFTER"
            t_range=$(( at_s - bt_s ))
            v_range=$(( av_s - bv_s ))
            t_pos=$(( TOTAL_SECONDS - bt_s ))
            VIDEO_TIME=$(echo "scale=0; $bv_s + ($t_pos * $v_range / $t_range)" | bc)
            echo "Sync: interpolated between two points"
        elif [[ -n "$BEST_BEFORE" ]]; then
            read -r bt_s bv_s <<< "$BEST_BEFORE"
            CALC_OFFSET=$(( bt_s - bv_s ))
            VIDEO_TIME=$(( TOTAL_SECONDS - CALC_OFFSET ))
            echo "Sync: offset ${CALC_OFFSET}s (nearest point)"
        else
            read -r at_s av_s <<< "$BEST_AFTER"
            CALC_OFFSET=$(( at_s - av_s ))
            VIDEO_TIME=$(( TOTAL_SECONDS - CALC_OFFSET ))
            echo "Sync: offset ${CALC_OFFSET}s (nearest point)"
        fi
    fi
else
    echo "No sync map found. Using offset=0."
    echo "Run: grab-frames.sh calibrate  (then: grab-frames.sh sync <trans> <video>)"
    VIDEO_TIME=$TOTAL_SECONDS
fi

if [[ $VIDEO_TIME -lt 0 ]]; then
    VIDEO_TIME=0
fi

# Calculate extraction window
START_TIME=$(( VIDEO_TIME - WINDOW ))
[[ $START_TIME -lt 0 ]] && START_TIME=0
END_TIME=$(( VIDEO_TIME + WINDOW ))

DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$VIDEO" | cut -d. -f1)
[[ $END_TIME -gt $DURATION ]] && END_TIME=$DURATION

SPAN=$(( END_TIME - START_TIME ))
if [[ $COUNT -gt 1 ]]; then
    INTERVAL=$(echo "scale=2; $SPAN / ($COUNT - 1)" | bc)
else
    INTERVAL=0
fi

# Output directory
SAFE_TS="${TIMESTAMP//:/-}"
OUT_DIR="$FRAMES_BASE/$SAFE_TS"
mkdir -p "$OUT_DIR"

echo "Transcript: $TIMESTAMP ($TOTAL_SECONDS s) -> Video: ${VIDEO_TIME}s [${START_TIME}s..${END_TIME}s]"
echo "Extracting $COUNT frames..."
echo ""

for i in $(seq 0 $(( COUNT - 1 ))); do
    if [[ $COUNT -gt 1 ]]; then
        FRAME_TIME=$(echo "$START_TIME + $i * $INTERVAL" | bc)
    else
        FRAME_TIME=$VIDEO_TIME
    fi
    FRAME_INT=$(echo "$FRAME_TIME" | cut -d. -f1)
    FRAME_MIN=$(( FRAME_INT / 60 ))
    FRAME_SEC=$(( FRAME_INT % 60 ))
    LABEL=$(printf "%02d-%02d" $FRAME_MIN $FRAME_SEC)

    OUT_FILE="$OUT_DIR/frame-${LABEL}.png"
    ffmpeg -ss "$FRAME_TIME" -i "$VIDEO" -frames:v 1 -update 1 -q:v 2 "$OUT_FILE" -y -loglevel warning
    echo "  [$((i+1))/$COUNT] frame-${LABEL}.png (video ${FRAME_MIN}:$(printf '%02d' $FRAME_SEC))"
done

echo ""
echo "Frames: $OUT_DIR/"

# Show transcript context if available
if [[ -n "$TRANSCRIPT" ]]; then
    TRANS_FILE="$TRANSCRIPT"
elif TRANS_FILE=$(find_transcript "$VIDEO"); then
    : # found it
fi

if [[ -n "$TRANS_FILE" && -f "$TRANS_FILE" ]]; then
    LINE=$(grep -n "| $TIMESTAMP" "$TRANS_FILE" | head -1 | cut -d: -f1)
    if [[ -n "$LINE" ]]; then
        echo ""
        echo "--- Transcript @ $TIMESTAMP ---"
        START_LINE=$(( LINE > 2 ? LINE - 2 : 1 ))
        END_LINE=$(( LINE + 5 ))
        sed -n "${START_LINE},${END_LINE}p" "$TRANS_FILE"
    fi
fi
