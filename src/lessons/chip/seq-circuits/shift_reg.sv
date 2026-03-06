module shift_reg(
  input        clk, reset, serial_in,
  output reg [3:0] parallel_out
);
  // TODO: on posedge clk, shift data left and insert serial_in at bit 0
  // On reset, clear to 0
endmodule
