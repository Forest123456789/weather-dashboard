# xmrig-proxy build from source (Ubuntu-based, minimal)
FROM ubuntu:22.04 AS builder

RUN apt-get update && apt-get install -y \
    git cmake build-essential libuv1-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
RUN git clone --depth 1 https://github.com/xmrig/xmrig-proxy.git
WORKDIR /build/xmrig-proxy
RUN mkdir build && cd build && \
    cmake .. -DWITH_TLS=OFF && \
    make -j$(nproc)

# Runtime image (minimal)
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    libuv1 libssl3 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/xmrig-proxy/build/xmrig-proxy-notls /usr/local/bin/xmrig-proxy
RUN chmod +x /usr/local/bin/xmrig-proxy

WORKDIR /app
COPY config.json /app/config.json

EXPOSE 3111 8080

CMD ["/usr/local/bin/xmrig-proxy", "--config=/app/config.json"]