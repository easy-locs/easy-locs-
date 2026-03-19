export interface MediaE2eeContext {
  keyBytes: Uint8Array;
}

function xorBuffer(data: ArrayBuffer, key: Uint8Array): ArrayBuffer {
  const input = new Uint8Array(data);
  const out = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = input[i] ^ key[i % key.length];
  return out.buffer;
}

export function attachSenderTransform(sender: RTCRtpSender, ctx: MediaE2eeContext) {
  const anySender = sender as RTCRtpSender & {
    createEncodedStreams?: () => { readable: ReadableStream<any>; writable: WritableStream<any> };
  };

  if (!anySender.createEncodedStreams) return false;

  const { readable, writable } = anySender.createEncodedStreams();
  const transform = new TransformStream({
    transform: (chunk, controller) => {
      chunk.data = xorBuffer(chunk.data, ctx.keyBytes);
      controller.enqueue(chunk);
    },
  });

  readable.pipeThrough(transform).pipeTo(writable);
  return true;
}

export function attachReceiverTransform(receiver: RTCRtpReceiver, ctx: MediaE2eeContext) {
  const anyReceiver = receiver as RTCRtpReceiver & {
    createEncodedStreams?: () => { readable: ReadableStream<any>; writable: WritableStream<any> };
  };

  if (!anyReceiver.createEncodedStreams) return false;

  const { readable, writable } = anyReceiver.createEncodedStreams();
  const transform = new TransformStream({
    transform: (chunk, controller) => {
      chunk.data = xorBuffer(chunk.data, ctx.keyBytes);
      controller.enqueue(chunk);
    },
  });

  readable.pipeThrough(transform).pipeTo(writable);
  return true;
}
