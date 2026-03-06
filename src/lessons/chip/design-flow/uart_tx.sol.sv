// Same file — this is a reference design, no modifications needed
module uart_tx(
  input        clk, reset,
  input  [7:0] data,
  input        send,
  output reg   tx,
  output reg   busy
);
  localparam IDLE = 2'd0, START = 2'd1, DATA = 2'd2, STOP = 2'd3;
  reg [1:0] state;
  reg [2:0] bit_idx;

  always @(posedge clk) begin
    if (reset) begin
      state <= IDLE; tx <= 1; busy <= 0;
    end else begin
      case (state)
        IDLE: begin
          tx <= 1;
          if (send) begin state <= START; busy <= 1; end
        end
        START: begin
          tx <= 0;
          state <= DATA; bit_idx <= 0;
        end
        DATA: begin
          tx <= data[bit_idx];
          if (bit_idx == 7) state <= STOP;
          else bit_idx <= bit_idx + 1;
        end
        STOP: begin
          tx <= 1;
          state <= IDLE; busy <= 0;
        end
      endcase
    end
  end
endmodule
