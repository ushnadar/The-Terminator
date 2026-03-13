from winotify import Notification, audio

toast = Notification(
    app_id="Terminator test",
    title="Resource usage alert",
    msg="Click to check out the resource alert flagged by our state of the art AI system.",
    duration="short"  # "short" or "long"
)

toast.set_audio(audio.Reminder, loop=False)
toast.add_actions(label="Open", launch="https://example.com") #idher url aye ga terminator app ka or sumn idk
toast.show()